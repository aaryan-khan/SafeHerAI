package com.safeherai.backend.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Only fields a user may change themselves. Role and email are deliberately not here. */
public record UpdateProfileRequest(
        @NotBlank
        @Size(max = ValidationRules.DISPLAY_NAME_MAX)
        @Pattern(regexp = ValidationRules.DISPLAY_NAME_PATTERN,
                message = "may only contain letters, numbers, spaces and . ' _ -")
        String displayName) {
}