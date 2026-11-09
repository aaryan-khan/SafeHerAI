package com.safeherai.backend.area;

import com.safeherai.backend.incident.IncidentCategory;
import java.time.Instant;
import java.util.Map;

/**
 * Plain facts about reports near a point. Only counts: no ids, no text, no exact places,
 * and deliberately no "safety score".
 *
 * @param total          reports in the last {@code windowDays} days
 * @param verified       how many of {@code total} a moderator has verified
 * @param previousTotal  reports in the {@code windowDays} days before that, to show a trend
 * @param includesDemo   true if made-up demo reports are part of these numbers
 */
public record AreaSummary(
        int radiusMeters,
        int windowDays,
        Instant from,
        Instant to,
        int total,
        int verified,
        int previousTotal,
        boolean includesDemo,
        Map<IncidentCategory, Integer> byCategory,
        Map<TimeOfDay, Integer> byTimeOfDay,
        DataLevel dataLevel) {
}
