package com.safeherai.backend.incident;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads and writes incidents with plain SQL so we can use PostGIS functions directly.
 * The public map query never selects reported_by, never returns the exact location,
 * and never returns unapproved text.
 */
@Repository
public class IncidentRepository {

    /** Rounding to 3 decimal places of a degree is about 110 m north-south (a little less east-west in India). */
    private static final String IN_BOX = """
            SELECT id, category,
                   CASE WHEN description_approved THEN description END AS description,
                   (description IS NOT NULL AND NOT description_approved) AS description_pending,
                   ROUND(ST_Y(location)::numeric, 3)::float8 AS latitude,
                   ROUND(ST_X(location)::numeric, 3)::float8 AS longitude,
                   occurred_at, verification_status, is_demo
            FROM incidents
            WHERE location && ST_MakeEnvelope(?, ?, ?, ?, 4326)
              AND moderation_status = 'VISIBLE'
              AND deleted_at IS NULL
              AND (? OR NOT is_demo)
            ORDER BY occurred_at DESC, id
            LIMIT ?
            """;

    private static final String OWN_COLUMNS = """
            SELECT id, category, description, description_approved,
                   ST_Y(location) AS latitude, ST_X(location) AS longitude,
                   occurred_at, verification_status, moderation_status, created_at
            FROM incidents
            """;

    private final JdbcTemplate jdbc;

    public IncidentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Newest first. "&&" means "inside the box" and uses the spatial index. */
    public List<IncidentResponse> findInBox(BoundingBox box, boolean includeDemo, int limit) {
        return jdbc.query(IN_BOX, IncidentRepository::mapPublic,
                box.minLon(), box.minLat(), box.maxLon(), box.maxLat(), includeDemo, limit);
    }

    public void insert(UUID id, UUID reporter, CreateIncidentRequest request, String description) {
        jdbc.update("""
                INSERT INTO incidents (id, category, description, location, occurred_at, reported_by)
                VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?)
                """, id, request.category().name(), description, request.longitude(), request.latitude(),
                Timestamp.from(request.occurredAt()), reporter);
    }

    /** Holds a lock on this reporter until the transaction ends (PostgreSQL advisory lock). */
    public void lockReporter(UUID reporter) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?::text, 0))", rs -> null, reporter);
    }

    /** Counts ALL reports since a moment, including deleted ones, for the report limits. */
    public int countReportedSince(UUID reporter, Instant since) {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM incidents WHERE reported_by = ? AND created_at >= ?",
                Integer.class, reporter, Timestamp.from(since));
        return count == null ? 0 : count;
    }

    public Optional<OwnIncidentResponse> findOwn(UUID id) {
        return jdbc.query(OWN_COLUMNS + " WHERE id = ? AND deleted_at IS NULL", IncidentRepository::mapOwn, id)
                .stream().findFirst();
    }

    public List<OwnIncidentResponse> findByReporter(UUID reporter, int limit) {
        return jdbc.query(OWN_COLUMNS + " WHERE reported_by = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?",
                IncidentRepository::mapOwn, reporter, limit);
    }

    /** Erases the text and marks the report deleted. Returns false if it isn't this user's (or doesn't exist). */
    public boolean softDelete(UUID id, UUID reporter) {
        return jdbc.update("""
                UPDATE incidents SET deleted_at = now(), description = NULL, description_approved = FALSE
                WHERE id = ? AND reported_by = ? AND deleted_at IS NULL
                """, id, reporter) == 1;
    }

    /** User reports a moderator still needs to look at: unverified, or with text nobody has approved yet. */
    public List<OwnIncidentResponse> findNeedingReview(int limit) {
        return jdbc.query(OWN_COLUMNS + """
                 WHERE deleted_at IS NULL AND reported_by IS NOT NULL AND moderation_status = 'VISIBLE'
                   AND (verification_status = 'UNVERIFIED' OR (description IS NOT NULL AND NOT description_approved))
                 ORDER BY created_at
                 LIMIT ?
                """, IncidentRepository::mapOwn, limit);
    }

    /** Applies a moderator's decision. Fields left null stay as they are. */
    public boolean moderate(UUID id, UUID moderator, ModerateIncidentRequest change) {
        return jdbc.update("""
                UPDATE incidents SET
                    verification_status  = COALESCE(?, verification_status),
                    moderation_status    = COALESCE(?, moderation_status),
                    description_approved = COALESCE(?, description_approved),
                    description          = CASE WHEN ? THEN NULL ELSE description END,
                    moderated_by = ?, moderated_at = now()
                WHERE id = ? AND deleted_at IS NULL
                """,
                change.verificationStatus() == null ? null : change.verificationStatus().name(),
                change.moderationStatus() == null ? null : change.moderationStatus().name(),
                change.descriptionApproved(),
                Boolean.TRUE.equals(change.removeDescription()),
                moderator, id) == 1;
    }

    private static IncidentResponse mapPublic(ResultSet rs, int row) throws SQLException {
        return new IncidentResponse(
                rs.getObject("id", UUID.class),
                IncidentCategory.valueOf(rs.getString("category")),
                rs.getString("description"),
                rs.getBoolean("description_pending"),
                rs.getDouble("latitude"),
                rs.getDouble("longitude"),
                rs.getTimestamp("occurred_at").toInstant(),
                VerificationStatus.valueOf(rs.getString("verification_status")),
                rs.getBoolean("is_demo"));
    }

    private static OwnIncidentResponse mapOwn(ResultSet rs, int row) throws SQLException {
        return new OwnIncidentResponse(
                rs.getObject("id", UUID.class),
                IncidentCategory.valueOf(rs.getString("category")),
                rs.getString("description"),
                rs.getBoolean("description_approved"),
                rs.getDouble("latitude"),
                rs.getDouble("longitude"),
                rs.getTimestamp("occurred_at").toInstant(),
                VerificationStatus.valueOf(rs.getString("verification_status")),
                ModerationStatus.valueOf(rs.getString("moderation_status")),
                rs.getTimestamp("created_at").toInstant());
    }
}
