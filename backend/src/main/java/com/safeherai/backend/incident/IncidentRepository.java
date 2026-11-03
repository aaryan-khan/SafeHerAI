package com.safeherai.backend.incident;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads incidents with plain SQL so we can use PostGIS functions directly.
 * The SELECT list never includes reported_by.
 */
@Repository
public class IncidentRepository {

    private static final String IN_BOX = """
            SELECT id, category, description, ST_Y(location) AS latitude, ST_X(location) AS longitude,
                   occurred_at, verification_status, is_demo
            FROM incidents
            WHERE location && ST_MakeEnvelope(?, ?, ?, ?, 4326)
              AND (? OR NOT is_demo)
            ORDER BY occurred_at DESC, id
            LIMIT ?
            """;

    private final JdbcTemplate jdbc;

    public IncidentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Newest first. "&&" means "inside the box" and uses the spatial index. */
    public List<IncidentResponse> findInBox(BoundingBox box, boolean includeDemo, int limit) {
        return jdbc.query(IN_BOX, IncidentRepository::map,
                box.minLon(), box.minLat(), box.maxLon(), box.maxLat(), includeDemo, limit);
    }

    private static IncidentResponse map(ResultSet rs, int row) throws SQLException {
        return new IncidentResponse(
                rs.getObject("id", UUID.class),
                IncidentCategory.valueOf(rs.getString("category")),
                rs.getString("description"),
                rs.getDouble("latitude"),
                rs.getDouble("longitude"),
                rs.getTimestamp("occurred_at").toInstant(),
                VerificationStatus.valueOf(rs.getString("verification_status")),
                rs.getBoolean("is_demo"));
    }
}
