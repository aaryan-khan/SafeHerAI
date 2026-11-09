package com.safeherai.backend.area;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Counts reports within a real distance (metres) of a point, using PostGIS geography.
 * Same visibility rules as the map: no hidden or deleted reports; demo reports only if switched on.
 */
@Repository
public class AreaSummaryRepository {

    /** One row per (category, verified, demo, hour in India) combination in the window. */
    public record Group(String category, boolean verified, boolean demo, int hourInIndia, int count) {
    }

    private static final String NEAR = """
            WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
              AND moderation_status = 'VISIBLE'
              AND deleted_at IS NULL
              AND (? OR NOT is_demo)
            """;

    private final JdbcTemplate jdbc;

    public AreaSummaryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Reports from {@code from} onwards, grouped so that only a few small rows come back. */
    public List<Group> groupsSince(double lat, double lon, int radiusMeters, boolean includeDemo, Instant from) {
        return jdbc.query("""
                SELECT category, verification_status = 'VERIFIED' AS verified, is_demo,
                       EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Kolkata')::int AS hour_in_india,
                       count(*)::int AS n
                FROM incidents
                """ + NEAR + """
                  AND occurred_at >= ?
                GROUP BY 1, 2, 3, 4
                """,
                (rs, row) -> new Group(rs.getString("category"), rs.getBoolean("verified"), rs.getBoolean("is_demo"),
                        rs.getInt("hour_in_india"), rs.getInt("n")),
                lon, lat, radiusMeters, includeDemo, Timestamp.from(from));
    }

    /** Reports with from <= occurred_at < to. */
    public int countBetween(double lat, double lon, int radiusMeters, boolean includeDemo, Instant from, Instant to) {
        Integer n = jdbc.queryForObject("""
                SELECT count(*)::int FROM incidents
                """ + NEAR + """
                  AND occurred_at >= ? AND occurred_at < ?
                """, Integer.class, lon, lat, radiusMeters, includeDemo, Timestamp.from(from), Timestamp.from(to));
        return n == null ? 0 : n;
    }
}
