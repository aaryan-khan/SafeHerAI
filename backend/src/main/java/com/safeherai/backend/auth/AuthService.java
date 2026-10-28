package com.safeherai.backend.auth;

import com.safeherai.backend.auth.AuthDtos.AuthResponse;
import com.safeherai.backend.auth.AuthDtos.LoginRequest;
import com.safeherai.backend.auth.AuthDtos.RegisterRequest;
import com.safeherai.backend.common.ApiException;
import com.safeherai.backend.user.User;
import com.safeherai.backend.user.UserRepository;
import com.safeherai.backend.user.UserResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** One message for every login failure, so attackers can't tell which emails are registered. */
    private static final String BAD_CREDENTIALS = "Invalid email or password.";
    private static final String BAD_REFRESH = "Your session has expired. Please log in again.";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final TokenService tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    /** Used to spend the same time checking a password when the email doesn't exist (see login). */
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, TokenService tokens,
            PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validation failed", "Password is too long.");
        }
        String email = normaliseEmail(request.email());
        if (users.existsByEmail(email)) {
            // Known limitation: this reveals that the email is registered. Proper fix needs
            // email verification, planned for a later milestone. Rate limiting reduces abuse.
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered",
                    "An account with this email already exists. Try logging in instead.");
        }
        User user = new User(email, passwordEncoder.encode(request.password()), request.displayName().strip());
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Two sign-ups with the same email at the same moment: the database UNIQUE rule catches it.
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered",
                    "An account with this email already exists. Try logging in instead.");
        }
        return issueTokens(user, UUID.randomUUID());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Optional<User> found = users.findByEmail(normaliseEmail(request.email()));
        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash); // equalise response time
            throw unauthorized(BAD_CREDENTIALS);
        }
        User user = found.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash()) || !user.isEnabled()) {
            throw unauthorized(BAD_CREDENTIALS);
        }
        return issueTokens(user, UUID.randomUUID());
    }

    /**
     * Swaps a refresh token for a new pair (rotation). Each refresh token works only once.
     * If an already-used token shows up again, someone may have stolen it, so we end that
     * whole login session (the "family") for safety.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken current = refreshTokens.findByTokenHashForUpdate(TokenService.hash(rawRefreshToken))
                .orElseThrow(() -> unauthorized(BAD_REFRESH));

        if (current.isRevoked()) {
            int revoked = refreshTokens.revokeFamily(current.getFamilyId(), clock.instant());
            log.warn("Refresh token reuse detected; revoked token family {} ({} active tokens)",
                    current.getFamilyId(), revoked);
            throw unauthorized(BAD_REFRESH);
        }
        if (!current.getExpiresAt().isAfter(clock.instant())) {
            throw unauthorized(BAD_REFRESH);
        }
        User user = users.findById(current.getUserId())
                .filter(User::isEnabled)
                .orElseThrow(() -> unauthorized(BAD_REFRESH));

        current.revoke(clock.instant());
        return issueTokens(user, current.getFamilyId());
    }

    /** Ends the login session that this refresh token belongs to. Always "succeeds" to avoid leaking info. */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokens.findByTokenHashForUpdate(TokenService.hash(rawRefreshToken))
                .ifPresent(token -> refreshTokens.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    private AuthResponse issueTokens(User user, UUID familyId) {
        String accessToken = tokens.createAccessToken(user);
        String refreshToken = tokens.createRefreshToken(user.getId(), familyId);
        return new AuthResponse("Bearer", accessToken, tokens.accessTokenTtlSeconds(), refreshToken,
                UserResponse.from(user));
    }

    private static String normaliseEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private static ApiException unauthorized(String detail) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", detail);
    }
}