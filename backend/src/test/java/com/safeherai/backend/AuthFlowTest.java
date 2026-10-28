package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class AuthFlowTest extends IntegrationTest {

    // ---------- Registration ----------

    @Test
    void registerReturnsTokensAndNeverThePassword() throws Exception {
        String email = uniqueEmail();
        String body = register(email);

        assertThat(json(body, "$.tokenType")).isEqualTo("Bearer");
        assertThat(json(body, "$.accessToken")).isNotBlank();
        assertThat(json(body, "$.refreshToken")).isNotBlank();
        assertThat(json(body, "$.expiresIn")).isEqualTo("900");
        assertThat(json(body, "$.user.email")).isEqualTo(email);
        assertThat(json(body, "$.user.role")).isEqualTo("USER");
        assertThat(body).doesNotContain(PASSWORD).doesNotContainIgnoringCase("passwordHash");
    }

    @Test
    void passwordIsStoredOnlyAsBcryptHash() throws Exception {
        String email = uniqueEmail();
        register(email);
        String stored = jdbc.queryForObject("SELECT password_hash FROM users WHERE email = ?", String.class, email);
        assertThat(stored).startsWith("{bcrypt}").doesNotContain(PASSWORD);
    }

    @Test
    void duplicateEmailIsRejectedEvenWithDifferentCase() throws Exception {
        String email = uniqueEmail();
        register(email);
        postJson("/api/v1/auth/register", """
                {"email":"%s","password":"%s","displayName":"Copy Cat"}
                """.formatted(email.toUpperCase(), PASSWORD))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Email already registered"));
    }

    @Test
    void invalidRegistrationListsFieldsButNeverEchoesValues() throws Exception {
        String body = postJson("/api/v1/auth/register", """
                {"email":"not-an-email","password":"short","displayName":"<script>alert(1)</script>"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.errors[*].field").value(
                        org.hamcrest.Matchers.containsInAnyOrder("displayName", "email", "password")))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("short").doesNotContain("<script>");
    }

    @Test
    void roleSentByClientIsIgnored() throws Exception {
        String body = postJson("/api/v1/auth/register", """
                {"email":"%s","password":"%s","displayName":"Sneaky","role":"ADMIN"}
                """.formatted(uniqueEmail(), PASSWORD))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertThat(json(body, "$.user.role")).isEqualTo("USER");
    }

    // ---------- Login ----------

    @Test
    void loginWorksWithCorrectPasswordAndAnyEmailCase() throws Exception {
        String email = uniqueEmail();
        register(email);
        String body = login(email.toUpperCase());
        assertThat(json(body, "$.user.email")).isEqualTo(email);
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() throws Exception {
        String email = uniqueEmail();
        register(email);

        String wrongPassword = postJson("/api/v1/auth/login", """
                {"email":"%s","password":"wrong-password-123"}
                """.formatted(email))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String unknownEmail = postJson("/api/v1/auth/login", """
                {"email":"%s","password":"wrong-password-123"}
                """.formatted(uniqueEmail()))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(wrongPassword).isEqualTo(unknownEmail).contains("Invalid email or password.");
    }

    // ---------- Refresh tokens ----------

    @Test
    void refreshGivesNewTokensAndOldTokenStopsWorking() throws Exception {
        String first = json(register(uniqueEmail()), "$.refreshToken");

        String refreshed = refresh(first).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String second = json(refreshed, "$.refreshToken");
        assertThat(second).isNotEqualTo(first);

        // Reusing the old token is treated as possible theft...
        refresh(first).andExpect(status().isUnauthorized());
        // ...so the whole session is ended, including the newest token.
        refresh(second).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        String refreshToken = json(register(uniqueEmail()), "$.refreshToken");

        postJson("/api/v1/auth/logout", """
                {"refreshToken":"%s"}
                """.formatted(refreshToken))
                .andExpect(status().isNoContent());

        refresh(refreshToken).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutWithUnknownTokenStillReturns204() throws Exception {
        postJson("/api/v1/auth/logout", """
                {"refreshToken":"this-token-does-not-exist"}
                """)
                .andExpect(status().isNoContent());
    }

    @Test
    void expiredRefreshTokenIsRejected() throws Exception {
        String email = uniqueEmail();
        String refreshToken = json(register(email), "$.refreshToken");
        jdbc.update("""
                UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                """, email);

        refresh(refreshToken).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokensAreStoredOnlyAsHashes() throws Exception {
        String email = uniqueEmail();
        String refreshToken = json(register(email), "$.refreshToken");
        String stored = jdbc.queryForObject("""
                SELECT token_hash FROM refresh_tokens
                WHERE user_id = (SELECT id FROM users WHERE email = ?)
                """, String.class, email);
        assertThat(stored).hasSize(64).isNotEqualTo(refreshToken);
    }

    private ResultActions refresh(String refreshToken) throws Exception {
        return postJson("/api/v1/auth/refresh", """
                {"refreshToken":"%s"}
                """.formatted(refreshToken));
    }

    private ResultActions postJson(String url, String content) throws Exception {
        return mockMvc.perform(post(url).with(uniqueIp())
                .contentType(MediaType.APPLICATION_JSON)
                .content(content));
    }
}