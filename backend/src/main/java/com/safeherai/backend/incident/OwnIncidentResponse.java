package com.safeherai.backend.incident;

import java.time.Instant;
import java.util.UUID;

/**
 * A report as its OWN reporter (or a moderator) sees it: exact location, full text,
 * and where it is in moderation.
 */
public record OwnIncidentResponse(
        UUID id,
        IncidentCategory category,
        String description,
        boolean descriptionApproved,
        double latitude,
        double longitude,
        Instant occurredAt,
        VerificationStatus verificationStatus,
        ModerationStatus moderationStatus,
        Instant createdAt) {
}
