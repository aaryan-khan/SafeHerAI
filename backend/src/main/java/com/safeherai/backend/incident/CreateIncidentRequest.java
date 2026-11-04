package com.safeherai.backend.incident;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * What the app sends to report an incident. Only these fields are read: anything else
 * in the body (for example "verificationStatus": "VERIFIED") is ignored.
 */
public record CreateIncidentRequest(
        @NotNull IncidentCategory category,
        @Size(max = 500) String description,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull Instant occurredAt) {
}
