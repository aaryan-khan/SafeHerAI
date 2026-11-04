package com.safeherai.backend.incident;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Incidents for the safety map. Logged-in users only (SecurityConfig denies by default).
 * The reporter is always the user in the verified access token, never a value from the request.
 * Example: GET /api/v1/incidents?minLon=72.80&minLat=18.90&maxLon=72.95&maxLat=19.10
 */
@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {

    /** The phone can't usefully draw more markers than this; "truncated" tells it to zoom in. */
    static final int MAX_RESULTS = 300;

    private final IncidentRepository incidents;
    private final IncidentService service;
    private final boolean includeDemo;

    public IncidentController(IncidentRepository incidents, IncidentService service,
            @Value("${safeherai.map.include-demo-data:false}") boolean includeDemo) {
        this.incidents = incidents;
        this.service = service;
        this.includeDemo = includeDemo;
    }

    public record IncidentPage(List<IncidentResponse> items, boolean truncated) {
    }

    public record OwnIncidentList(List<OwnIncidentResponse> items) {
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OwnIncidentResponse report(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateIncidentRequest request) {
        return service.report(UUID.fromString(jwt.getSubject()), request);
    }

    /** The user's own reports, newest first, including ones a moderator has hidden. */
    @GetMapping("/mine")
    public OwnIncidentList mine(@AuthenticationPrincipal Jwt jwt) {
        return new OwnIncidentList(incidents.findByReporter(UUID.fromString(jwt.getSubject()), 100));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        service.delete(UUID.fromString(jwt.getSubject()), id);
    }
}
