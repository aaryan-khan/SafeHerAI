package com.safeherai.backend.user;

import java.time.Instant;
import java.util.UUID;

/** What the API returns about a user. Never includes the password hash. */
public record UserResponse(UUID id, String email, String displayName, Role role, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), user.getCreatedAt());
    }
}