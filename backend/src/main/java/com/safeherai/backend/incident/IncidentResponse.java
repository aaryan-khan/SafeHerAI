package com.safeherai.backend.incident;

import java.time.Instant;
import java.util.UUID;

/**
 * One incident as OTHER users see it on the map.
 * - Deliberately has NO field about who reported it.
 * - latitude/longitude are rounded to about 100 m, to protect the reporter.
 * - description is null until a moderator approves it; descriptionPending then says one exists.
 */
public record IncidentResponse(
        UUID id,
        IncidentCategory category,
        String description,
        boolean descriptionPending,
        double latitude,
        double longitude,
        Instant occurredAt,
        VerificationStatus verificationStatus,
        boolean isDemo) {
}
