package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * "What has been reported around here?" (Milestone 6).
 * Every test uses its own spot far away from real places, so tests never count each other's reports.
 */
class AreaSummaryTest extends IntegrationTest {

    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final AtomicInteger SPOT = new AtomicInteger();

    /** About 111 metres north-south per 0.001 degree of latitude. */
    private static final double METRES_PER_DEGREE_LAT = 111_000;

    private String token;
    private double lat;
    private double lon;

    @BeforeEach
    void setUp() throws Exception {
        token = json(register(uniqueEmail()), "$.accessToken");
        int n = SPOT.incrementAndGet();
        lat = -20.0;            // southern Atlantic: nothing real is here
        lon = -30.0 + n * 0.5;  // spots 50 km apart
    }

    // ---------- Access and input ----------

    @Test
    void summaryRequiresLogin() throws Exception {
        mockMvc.perform(get("/api/v1/areas/summary").with(uniqueIp()).param("lat", "19").param("lon", "72.8"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidInputIsRejected() throws Exception {
        summary("95", "72.8", "500").andExpect(status().isBadRequest());
        summary("19", "200", "500").andExpect(status().isBadRequest());
        summary("NaN", "72.8", "500").andExpect(status().isBadRequest());
        summary("19", "72.8", "300").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Radius must be 250, 500 or 1000 metres."));
        mockMvc.perform(get("/api/v1/areas/summary").with(uniqueIp()).header("Authorization", "Bearer " + token)
                        .param("lon", "72.8"))
                .andExpect(status().isBadRequest());
    }

    // ---------- Counting ----------

    @Test
    void countsOnlyReportsWithinTheRadius() throws Exception {
        insertMetresNorth(100, "HARASSMENT", false, daysAgo(3));
        insertMetresNorth(400, "STALKING", false, daysAgo(3));
        insertMetresNorth(800, "OTHER", false, daysAgo(3));

        summary(250).andExpect(jsonPath("$.total").value(1));
        summary(500).andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.radiusMeters").value(500));
        summary(1000).andExpect(jsonPath("$.total").value(3));
    }

    @Test
    void radiusDefaultsTo500Metres() throws Exception {
        insertMetresNorth(400, "OTHER", false, daysAgo(1));
        insertMetresNorth(800, "OTHER", false, daysAgo(1));
        mockMvc.perform(get("/api/v1/areas/summary").with(uniqueIp()).header("Authorization", "Bearer " + token)
                        .param("lat", String.valueOf(lat)).param("lon", String.valueOf(lon)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.radiusMeters").value(500))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void breaksDownByCategoryVerificationAndTimeOfDayInIndia() throws Exception {
        // Times are India time. In UTC (5.5 hours behind) these would fall into different groups,
        // so this test also catches a time-zone mistake.
        insert(at(6), "HARASSMENT", "VERIFIED");     // morning (UTC: night)
        insert(at(9), "HARASSMENT", "UNVERIFIED");   // morning (UTC: night)
        insert(at(14), "POOR_LIGHTING", "VERIFIED"); // afternoon (UTC: morning)
        insert(at(19), "STALKING", "UNVERIFIED");    // evening (UTC: afternoon)
        insert(at(23), "STALKING", "UNVERIFIED");    // night (UTC: evening)

        summary(500)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.verified").value(2))
                .andExpect(jsonPath("$.byCategory.HARASSMENT").value(2))
                .andExpect(jsonPath("$.byCategory.STALKING").value(2))
                .andExpect(jsonPath("$.byCategory.POOR_LIGHTING").value(1))
                .andExpect(jsonPath("$.byCategory.UNSAFE_CROWD").value(0))
                .andExpect(jsonPath("$.byCategory.OTHER").value(0))
                .andExpect(jsonPath("$.byTimeOfDay.MORNING").value(2))
                .andExpect(jsonPath("$.byTimeOfDay.AFTERNOON").value(1))
                .andExpect(jsonPath("$.byTimeOfDay.EVENING").value(1))
                .andExpect(jsonPath("$.byTimeOfDay.NIGHT").value(1))
                .andExpect(jsonPath("$.dataLevel").value("SOME"));
    }

    @Test
    void comparesWithThePrevious90Days() throws Exception {
        insertMetresNorth(50, "OTHER", false, daysAgo(10));
        insertMetresNorth(50, "OTHER", false, daysAgo(100));
        insertMetresNorth(50, "OTHER", false, daysAgo(120));
        insertMetresNorth(50, "OTHER", false, daysAgo(200)); // older than both periods

        summary(500)
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.previousTotal").value(2))
                .andExpect(jsonPath("$.windowDays").value(90));
    }

    @Test
    void leavesOutHiddenAndDeletedReports() throws Exception {
        UUID hidden = insertMetresNorth(50, "OTHER", false, daysAgo(1));
        UUID deleted = insertMetresNorth(50, "OTHER", false, daysAgo(1));
        insertMetresNorth(50, "OTHER", false, daysAgo(1));
        jdbc.update("UPDATE incidents SET moderation_status = 'HIDDEN' WHERE id = ?", hidden);
        jdbc.update("UPDATE incidents SET deleted_at = now() WHERE id = ?", deleted);

        summary(500).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void saysHowMuchDataThereIs() throws Exception {
        summary(500).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.dataLevel").value("NONE"));

        for (int i = 0; i < 4; i++) insertMetresNorth(50, "OTHER", false, daysAgo(1));
        summary(500).andExpect(jsonPath("$.dataLevel").value("LIMITED"));

        insertMetresNorth(50, "OTHER", false, daysAgo(1));
        summary(500).andExpect(jsonPath("$.dataLevel").value("SOME"));
    }

    @Test
    void saysWhenDemoDataIsIncluded() throws Exception {
        insertMetresNorth(50, "OTHER", false, daysAgo(1));
        summary(500).andExpect(jsonPath("$.includesDemo").value(false));

        insertMetresNorth(60, "OTHER", true, daysAgo(1));
        summary(500).andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.includesDemo").value(true));
    }

    @Test
    void returnsOnlyNumbersNeverDetailsOfReports() throws Exception {
        UUID id = insertMetresNorth(50, "OTHER", false, daysAgo(1));
        jdbc.update("UPDATE incidents SET description = 'secret words', description_approved = TRUE WHERE id = ?", id);

        String body = summary(500).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(id.toString()).doesNotContain("secret words");
        // No "safety score" or "isSafe"-style field, ever.
        assertThat(body).doesNotContainPattern("(?i)\"[a-z]*(safe|score)[a-z]*\"\\s*:");
    }

    @Test
    void tooManySummariesFromOneAddressAreBlocked() throws Exception {
        RequestPostProcessor sameIp = uniqueIp();
        // The test profile allows 10 per minute per address (same limit as the map).
        for (int i = 0; i < 10; i++) {
            summary(sameIp, 500).andExpect(status().isOk());
        }
        summary(sameIp, 500).andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
    }

    // ---------- Helpers ----------

    private ResultActions summary(int radius) throws Exception {
        return summary(uniqueIp(), radius);
    }

    private ResultActions summary(RequestPostProcessor ip, int radius) throws Exception {
        return mockMvc.perform(get("/api/v1/areas/summary").with(ip).header("Authorization", "Bearer " + token)
                .param("lat", String.valueOf(lat)).param("lon", String.valueOf(lon))
                .param("radius", String.valueOf(radius)));
    }

    private ResultActions summary(String lat, String lon, String radius) throws Exception {
        return mockMvc.perform(get("/api/v1/areas/summary").with(uniqueIp()).header("Authorization", "Bearer " + token)
                .param("lat", lat).param("lon", lon).param("radius", radius));
    }

    private UUID insertMetresNorth(double metres, String category, boolean demo, Instant occurredAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO incidents (id, category, location, occurred_at, is_demo)
                VALUES (?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?)
                """, id, category, lon, lat + metres / METRES_PER_DEGREE_LAT, Timestamp.from(occurredAt), demo);
        return id;
    }

    private void insert(Instant occurredAt, String category, String verification) {
        UUID id = insertMetresNorth(50, category, false, occurredAt);
        jdbc.update("UPDATE incidents SET verification_status = ? WHERE id = ?", verification, id);
    }

    /** Two days ago in India, at the given hour of the day. */
    private static Instant at(int hourInIndia) {
        return ZonedDateTime.now(INDIA).minusDays(2).with(LocalTime.of(hourInIndia, 30)).toInstant();
    }

    private static Instant daysAgo(int days) {
        return Instant.now().minus(days, ChronoUnit.DAYS);
    }
}
