package com.safeherai.backend.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Slows down password guessing and mass sign-ups by limiting how often one IP address
 * may call the public auth endpoints. Other endpoints are not affected.
 *
 * Limits are kept in memory, so they reset when the app restarts and are not shared
 * between multiple servers. That is fine for now; we revisit it before deployment.
 */
@Component
@EnableConfigurationProperties(RateLimitProperties.class)
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final Map<String, RateLimitProperties.Limit> limitsByPath;

    /** One bucket per (endpoint, IP). Idle buckets are forgotten after an hour; size is capped. */
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(1))
            .maximumSize(100_000)
            .build();

    public AuthRateLimitFilter(RateLimitProperties props) {
        this.limitsByPath = Map.of(
                "/api/v1/auth/login", props.login(),
                "/api/v1/auth/register", props.register(),
                "/api/v1/auth/refresh", props.refresh());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !limitsByPath.containsKey(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        // getRemoteAddr() is the real connecting address. We deliberately ignore X-Forwarded-For,
        // which clients can fake. (Behind a proxy in production we'll configure this properly.)
        String key = path + "|" + request.getRemoteAddr();
        RateLimitProperties.Limit limit = limitsByPath.get(path);
        Bucket bucket = buckets.get(key, k -> Bucket.builder()
                .addLimit(l -> l.capacity(limit.capacity()).refillGreedy(limit.capacity(), limit.period()))
                .build());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            chain.doFilter(request, response);
            return;
        }
        long retryAfterSeconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds());
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        ProblemResponses.write(response, 429, "Too Many Requests",
                "Too many attempts. Please wait a little and try again.");
    }
}