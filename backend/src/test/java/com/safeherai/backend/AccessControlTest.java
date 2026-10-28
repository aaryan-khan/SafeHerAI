package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class AccessControlTest extends IntegrationTest {

    @Autowired
    JwtEncoder realEncoder;

    // ---------- Who can reach /users/me ----------

    @Test
    void profileRequiresAToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    @Test
    void userCanReadAndUpdateOwnProfileButNotTheirRole() throws Exception {
        String email = uniqueEmail();
        String token = json(register(email), "$.accessToken");

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Priya S.","role":"ADMIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Priya S."))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void invalidDisplayNameIsRejected() throws Exception {
        String token = json(register(uniqueEmail()), "$.accessToken");
        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"<img src=x>"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ---------- Bad tokens ----------

    @Test
    void tamperedTokenIsRejected() throws Exception {
        String token = json(register(uniqueEmail()), "$.accessToken");
        char last = token.charAt(token.length() - 1);
        String tampered = token.substring(0, token.length() - 1) + (last == 'A' ? 'B' : 'A');

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        String userId = json(register(uniqueEmail()), "$.user.id");
        Instant past = Instant.now().minusSeconds(3600);
        String expired = sign(realEncoder, userId, past, past.plusSeconds(900));

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        String userId = json(register(uniqueEmail()), "$.user.id");
        byte[] attackerKey = "an-attacker-key-that-is-at-least-32-chars".getBytes(StandardCharsets.UTF_8);
        JwtEncoder attacker = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(attackerKey, "HmacSHA256")));
        String forged = sign(attacker, userId, Instant.now(), Instant.now().plusSeconds(900));

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenOfDeletedUserIsRejected() throws Exception {
        String email = uniqueEmail();
        String token = json(register(email), "$.accessToken");
        jdbc.update("DELETE FROM users WHERE email = ?", email);

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    // ---------- Roles ----------

    @Test
    void normalUserCannotUseAdminEndpoints() throws Exception {
        String token = json(register(uniqueEmail()), "$.accessToken");
        mockMvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Forbidden"));
    }

    @Test
    void adminCanListUsersWithoutSeeingPasswordHashes() throws Exception {
        String email = uniqueEmail();
        register(email);
        // Admin rights can only be granted directly in the database.
        jdbc.update("UPDATE users SET role = 'ADMIN' WHERE email = ?", email);
        String adminToken = json(login(email), "$.accessToken");

        String body = mockMvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("bcrypt").doesNotContainIgnoringCase("passwordHash");
    }

    @Test
    void hiddenActuatorEndpointsStayHiddenEvenWithAToken() throws Exception {
        String token = json(register(uniqueEmail()), "$.accessToken");
        mockMvc.perform(get("/actuator/env").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    private static String sign(JwtEncoder encoder, String userId, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("safeherai-backend")
                .subject(userId)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .claim("roles", List.of("USER"))
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}
