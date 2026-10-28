package com.safeherai.backend.user;

import com.safeherai.backend.common.ApiException;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for the logged-in user's OWN profile.
 * The user id always comes from the verified access token, never from the URL or body,
 * so one user can never read or change another user's profile.
 */
@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return UserResponse.from(currentUser(jwt));
    }

    @PatchMapping
    @Transactional
    public UserResponse updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        User user = currentUser(jwt);
        user.setDisplayName(request.displayName().strip());
        return UserResponse.from(user);
    }

    private User currentUser(Jwt jwt) {
        return users.findById(UUID.fromString(jwt.getSubject()))
                .filter(User::isEnabled)
                // Token is valid but the account was deleted or disabled since it was issued.
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized",
                        "Your session is no longer valid. Please log in again."));
    }
}