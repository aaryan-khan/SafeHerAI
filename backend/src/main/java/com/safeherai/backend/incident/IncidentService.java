package com.safeherai.backend.incident;

import com.safeherai.backend.common.ApiException;
import com.safeherai.backend.user.User;
import com.safeherai.backend.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creating and deleting a user's own reports, with the rules that protect the map from abuse. */
@Service
public class IncidentService {

    /** Phones' clocks are often a little off, so "a few minutes in the future" is still accepted. */
    static final Duration CLOCK_TOLERANCE = Duration.ofMinutes(5);
    static final Duration MAX_AGE = Duration.ofDays(30);

    private final IncidentRepository incidents;
    private final UserRepository users;
    private final Clock clock;
    private final int maxPerHour;
    private final int maxPerDay;

    public IncidentService(IncidentRepository incidents, UserRepository users, Clock clock,
            @Value("${safeherai.reports.max-per-hour:5}") int maxPerHour,
            @Value("${safeherai.reports.max-per-day:20}") int maxPerDay) {
        this.incidents = incidents;
        this.users = users;
        this.clock = clock;
        this.maxPerHour = maxPerHour;
        this.maxPerDay = maxPerDay;
    }

    @Transactional
    public OwnIncidentResponse report(UUID reporterId, CreateIncidentRequest request) {
        User reporter = users.findById(reporterId).filter(User::isEnabled)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized",
                        "Your session is no longer valid. Please log in again."));

        Instant now = clock.instant();
        if (request.occurredAt().isAfter(now.plus(CLOCK_TOLERANCE))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid time", "The time of the incident can't be in the future.");
        }
        if (request.occurredAt().isBefore(now.minus(MAX_AGE))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid time",
                    "Reports must be about something that happened in the last 30 days.");
        }

        String description = cleanDescription(request.description());
        if (request.category() == IncidentCategory.OTHER && description == null) {
            // "Other" on its own tells nobody anything.
            throw new ApiException(HttpStatus.BAD_REQUEST, "Details required",
                    "Please describe what happened when you choose \"Other\".");
        }

        // One report at a time per user, so two quick taps can't both slip under the limit.
        incidents.lockReporter(reporter.getId());
        if (incidents.countReportedSince(reporter.getId(), now.minus(Duration.ofHours(1))) >= maxPerHour
                || incidents.countReportedSince(reporter.getId(), now.minus(Duration.ofDays(1))) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many reports",
                    "You have sent a lot of reports recently. Please wait a while before sending another.");
        }

        UUID id = UUID.randomUUID();
        incidents.insert(id, reporter.getId(), request, description);
        return incidents.findOwn(id).orElseThrow();
    }

    /** Trims spaces; an empty description is stored as "no description". */
    static String cleanDescription(String raw) {
        if (raw == null) return null;
        String trimmed = raw.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional
    public void delete(UUID reporterId, UUID incidentId) {
        if (!incidents.softDelete(incidentId, reporterId)) {
            // Same answer whether it doesn't exist or belongs to someone else: we don't reveal which.
            throw new ApiException(HttpStatus.NOT_FOUND, "Not found", "This report doesn't exist.");
        }
    }
}
