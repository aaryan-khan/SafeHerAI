package com.safeherai.backend.incident;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Incidents for the safety map. Logged-in users only (SecurityConfig denies by default).
 * Example: GET /api/v1/incidents?minLon=72.80&minLat=18.90&maxLon=72.95&maxLat=19.10
 */
@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {

    /** The phone can't usefully draw more markers than this; "truncated" tells it to zoom in. */
    static final int MAX_RESULTS = 300;

    private final IncidentRepository incidents;
    private final boolean includeDemo;

    public IncidentController(IncidentRepository incidents,
            @Value("${safeherai.map.include-demo-data:false}") boolean includeDemo) {
        this.incidents = incidents;
        this.includeDemo = includeDemo;
    }

    public record IncidentPage(List<IncidentResponse> items, boolean truncated) {
    }

    @GetMapping
    public IncidentPage inArea(@RequestParam double minLon, @RequestParam double minLat,
            @RequestParam double maxLon, @RequestParam double maxLat) {
        BoundingBox box = BoundingBox.of(minLon, minLat, maxLon, maxLat);
        // Ask for one extra row: if it exists, there were more than we return.
        List<IncidentResponse> rows = incidents.findInBox(box, includeDemo, MAX_RESULTS + 1);
        boolean truncated = rows.size() > MAX_RESULTS;
        return new IncidentPage(truncated ? rows.subList(0, MAX_RESULTS) : rows, truncated);
    }
}
