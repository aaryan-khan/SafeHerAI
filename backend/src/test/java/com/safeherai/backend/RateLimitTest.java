package com.safeherai.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class RateLimitTest extends IntegrationTest {

    @Test
    void tooManyLoginAttemptsFromOneAddressAreBlocked() throws Exception {
        RequestPostProcessor sameIp = uniqueIp();
        String body = """
                {"email":"%s","password":"wrong-password-123"}
                """.formatted(uniqueEmail());

        // The test profile allows 5 login attempts per minute per address.
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login").with(sameIp)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/v1/auth/login").with(sameIp)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.title").value("Too Many Requests"));

        // A different address is not affected.
        mockMvc.perform(post("/api/v1/auth/login").with(uniqueIp())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }
}