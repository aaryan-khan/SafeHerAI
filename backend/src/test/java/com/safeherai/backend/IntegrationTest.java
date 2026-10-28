package com.safeherai.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Base class for all integration tests. Every test class that extends this shares ONE
 * Spring context and ONE throwaway PostGIS container, which keeps the test run fast.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    protected static final String PASSWORD = "correct-horse-battery";

    private static final AtomicInteger IP_COUNTER = new AtomicInteger(1);

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbc;

    /**
     * Gives each request batch its own fake IP address, so rate limits from one test
     * don't affect another.
     */
    protected static RequestPostProcessor uniqueIp() {
        int n = IP_COUNTER.getAndIncrement();
        String ip = "10.0." + (n / 250) + "." + (n % 250 + 1);
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    /** Registers a new user and returns the JSON response body. */
    protected String register(String email) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/register").with(uniqueIp())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s","displayName":"Test User"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    protected String login(String email) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").with(uniqueIp())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    protected static String json(String body, String path) {
        return JsonPath.read(body, path).toString();
    }
}