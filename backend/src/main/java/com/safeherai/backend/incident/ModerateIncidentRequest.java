package com.safeherai.backend.incident;

/**
 * A moderator's decision about one report. Every field is optional; only the ones sent change.
 * removeDescription=true erases the text for good (e.g. it named a person).
 */
public record ModerateIncidentRequest(
        VerificationStatus verificationStatus,
        ModerationStatus moderationStatus,
        Boolean descriptionApproved,
        Boolean removeDescription) {
}
