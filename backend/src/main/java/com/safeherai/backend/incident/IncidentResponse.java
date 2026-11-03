package com.safeherai.backend.incident;

import java.time.Instant;
import java.util.UUID;

/**
 * One incident as the map sees it.
 * Deliberately has NO field about who reported it.
 */
public record IncidentResponse(
        UUID id,
        IncidentCategory category,
        String description,
        double latitude,
        double longitude,
        Instant occurredAt,
        VerificationStatus verificationStatus,
        boolean isDemo) {
}
