package com.safeherai.backend.area;

import com.safeherai.backend.common.ApiException;
import com.safeherai.backend.incident.IncidentCategory;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * "What has been reported around here?" Logged-in users only (SecurityConfig denies by default).
 * Example: GET /api/v1/areas/summary?lat=19.076&lon=72.877&radius=500
 */
@RestController
@RequestMapping("/api/v1/areas")
public class AreaSummaryController {

    static final Set<Integer> RADII = Set.of(250, 500, 1000);
    static final int WINDOW_DAYS = 90;

    private final AreaSummaryRepository repository;
    private final Clock clock;
    private final boolean includeDemo;

    public AreaSummaryController(AreaSummaryRepository repository, Clock clock,
            @Value("${safeherai.map.include-demo-data:false}") boolean includeDemo) {
        this.repository = repository;
        this.clock = clock;
        this.includeDemo = includeDemo;
    }

    @GetMapping("/summary")
    public AreaSummary summary(@RequestParam double lat, @RequestParam double lon,
            @RequestParam(defaultValue = "500") int radius) {
        if (!Double.isFinite(lat) || !Double.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid place", "Coordinates are outside the valid range.");
        }
        if (!RADII.contains(radius)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid radius", "Radius must be 250, 500 or 1000 metres.");
        }

        Instant now = clock.instant();
        Instant from = now.minus(Duration.ofDays(WINDOW_DAYS));
        Instant previousFrom = from.minus(Duration.ofDays(WINDOW_DAYS));

        Map<IncidentCategory, Integer> byCategory = new EnumMap<>(IncidentCategory.class);
        for (IncidentCategory c : IncidentCategory.values()) byCategory.put(c, 0);
        Map<TimeOfDay, Integer> byTimeOfDay = new EnumMap<>(TimeOfDay.class);
        for (TimeOfDay t : TimeOfDay.values()) byTimeOfDay.put(t, 0);
        int total = 0;
        int verified = 0;
        boolean demo = false;

        for (AreaSummaryRepository.Group g : repository.groupsSince(lat, lon, radius, includeDemo, from)) {
            total += g.count();
            if (g.verified()) verified += g.count();
            if (g.demo()) demo = true;
            byCategory.merge(IncidentCategory.valueOf(g.category()), g.count(), Integer::sum);
            byTimeOfDay.merge(TimeOfDay.ofHour(g.hourInIndia()), g.count(), Integer::sum);
        }
        int previousTotal = repository.countBetween(lat, lon, radius, includeDemo, previousFrom, from);

        return new AreaSummary(radius, WINDOW_DAYS, from, now, total, verified, previousTotal, demo,
                byCategory, byTimeOfDay, DataLevel.of(total));
    }
}
