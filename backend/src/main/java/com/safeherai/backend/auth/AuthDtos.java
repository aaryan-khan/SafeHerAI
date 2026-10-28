package com.safeherai.backend.auth;

import com.safeherai.backend.user.UserResponse;
import com.safeherai.backend.user.ValidationRules;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request and response shapes for the /api/v1/auth endpoints. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = ValidationRules.EMAIL_MAX)
            String email,

            @NotBlank
            @Size(min = ValidationRules.PASSWORD_MIN, max = ValidationRules.PASSWORD_MAX)
            String password,

            @NotBlank
            @Size(max = ValidationRules.DISPLAY_NAME_MAX)
            @Pattern(regexp = ValidationRules.DISPLAY_NAME_PATTERN,
                    message = "may only contain letters, numbers, spaces and . ' _ -")
            String displayName) {
    }

    /** Login only checks that fields are present; password rules are enforced at registration. */
    public record LoginRequest(
            @NotBlank @Size(max = ValidationRules.EMAIL_MAX) String email,
            @NotBlank @Size(max = ValidationRules.PASSWORD_MAX) String password) {
    }

    public record RefreshRequest(@NotBlank @Size(max = 100) String refreshToken) {
    }

    public record AuthResponse(
            String tokenType,
            String accessToken,
            long expiresIn,
            String refreshToken,
            UserResponse user) {
    }
}