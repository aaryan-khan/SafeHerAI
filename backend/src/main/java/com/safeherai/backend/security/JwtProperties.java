package com.safeherai.backend.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Token settings from application.yml (prefix "safeherai.security.jwt").
 *
 * @param secret          HMAC signing key. Comes from JWT_SECRET in .env. Must be at least 32 characters.
 * @param issuer          written into every token and checked on every request
 * @param accessTokenTtl  how long an access token is valid (short)
 * @param refreshTokenTtl how long a refresh token is valid (longer; rotated on every use)
 */
@ConfigurationProperties(prefix = "safeherai.security.jwt")
public record JwtProperties(String secret, String issuer, Duration accessTokenTtl, Duration refreshTokenTtl) {

    public JwtProperties {
        if (secret == null || secret.isBlank() || secret.startsWith("${")) {
            throw new IllegalStateException("JWT_SECRET is not set. Add it to your .env file (see .env.example).");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters long.");
        }
    }
}