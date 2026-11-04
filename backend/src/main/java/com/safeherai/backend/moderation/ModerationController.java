package com.safeherai.backend.moderation;

import com.safeherai.backend.common.ApiException;
import com.safeherai.backend.incident.IncidentRepository;
import com.safeherai.backend.incident.ModerateIncidentRequest;
import com.safeherai.backend.incident.OwnIncidentResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Moderator tools. Access is enforced in SecurityConfig: /api/v1/moderation/** needs ROLE_MODERATOR or ROLE_ADMIN.
 * The moderator role can only be granted directly in the database.
 */
@RestController
@RequestMapping("/api/v1/moderation/incidents")
public class ModerationController {

    private final IncidentRepository incidents;

    public ModerationController(IncidentRepository incidents) {
        this.incidents = incidents;
    }

    public record ReviewQueue(List<OwnIncidentResponse> items) {
    }

    /** Oldest first: reports still unverified, or with text nobody has approved yet. */
    @GetMapping
    public ReviewQueue queue() {
        return new ReviewQueue(incidents.findNeedingReview(100));
    }

    @PatchMapping("/{id}")
    @Transactional
    public OwnIncidentResponse moderate(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestBody ModerateIncidentRequest request) {
        if (!incidents.moderate(id, UUID.fromString(jwt.getSubject()), request)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Not found", "This report doesn't exist.");
        }
        return incidents.findOwn(id).orElseThrow();
    }
}
