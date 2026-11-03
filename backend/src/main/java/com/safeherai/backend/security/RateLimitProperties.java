package com.safeherai.backend.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Per-IP-address limits for the public auth endpoints and map queries (prefix "safeherai.rate-limit").
 * Each limit means: at most {@code capacity} requests per {@code period}.
 */
@ConfigurationProperties(prefix = "safeherai.rate-limit")
public record RateLimitProperties(Limit login, Limit register, Limit refresh, Limit mapQuery) {

    public record Limit(int capacity, Duration period) {
    }
}
