package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Reporting incidents (Milestone 5) and moderating them.
 * Every test reports in its own area of the map, so tests never see each other's reports.
 */
class IncidentReportTest extends IntegrationTest {

    /** Each test gets its own 0.1-degree square far away from real places. */
    private static final AtomicInteger AREA = new AtomicInteger();

    private record Area(double lon, double lat) {
        String query() {
            return "minLon=%s&minLat=%s&maxLon=%s&maxLat=%s".formatted(lon, lat, lon + 0.1, lat + 0.1);
        }
    }

    private static Area newArea() {
        int n = AREA.incrementAndGet();
        return new Area(-40 + n, -40); // in the South Atlantic: nothing real is there
    }

    // ---------- Creating ----------

    @Test
    void reportingRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/v1/incidents").contentType(MediaType.APPLICATION_JSON)
                        .content(body("HARASSMENT", null, -39.95, -38.95, hoursAgo(1))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void newReportShowsOnTheMapAsUnverifiedWithTextHiddenAndLocationRounded() throws Exception {
        String token = newUserToken();
        Area area = newArea();
        double lat = area.lat() + 0.054321;
        double lon = area.lon() + 0.012345;

        String created = report(token, body("STALKING", "  A man followed me from the station  ", lat, lon, hoursAgo(1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("STALKING"))
                .andExpect(jsonPath("$.description").value("A man followed me from the station"))
                .andExpect(jsonPath("$.descriptionApproved").value(false))
                .andExpect(jsonPath("$.latitude").value(lat))
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.moderationStatus").value("VISIBLE"))
                .andReturn().getResponse().getContentAsString();
        String id = json(created, "$.id");

        // Another user looks at the map.
        String map = map(newUserToken(), area)
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(id))
                .andExpect(jsonPath("$.items[0].verificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.items[0].description").doesNotExist())
                .andExpect(jsonPath("$.items[0].descriptionPending").value(true))
                .andExpect(jsonPath("$.items[0].latitude").value(roundTo3(lat)))
                .andExpect(jsonPath("$.items[0].longitude").value(roundTo3(lon)))
                .andExpect(jsonPath("$.items[0].isDemo").value(false))
                .andReturn().getResponse().getContentAsString();
        assertThat(map).doesNotContain("followed").doesNotContain(String.valueOf(lat));
    }

    @Test
    void reportWithoutTextHasNothingPending() throws Exception {
        Area area = newArea();
        report(newUserToken(), body("POOR_LIGHTING", "   ", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").doesNotExist());
        map(newUserToken(), area).andExpect(jsonPath("$.items[0].descriptionPending").value(false));
    }

    @Test
    void clientCannotMarkItsOwnReportVerifiedOrDemo() throws Exception {
        Area area = newArea();
        report(newUserToken(), """
                {"category":"OTHER","latitude":%s,"longitude":%s,"occurredAt":"%s",
                 "verificationStatus":"VERIFIED","isDemo":true,"descriptionApproved":true}
                """.formatted(area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED"))
                .andExpect(jsonPath("$.descriptionApproved").value(false));
        map(newUserToken(), area).andExpect(jsonPath("$.items[0].isDemo").value(false));
    }

    @Test
    void invalidReportsAreRejected() throws Exception {
        String token = newUserToken();
        // missing category
        report(token, body(null, null, 10, 10, hoursAgo(1))).andExpect(status().isBadRequest());
        // unknown category
        report(token, body("ALIENS", null, 10, 10, hoursAgo(1))).andExpect(status().isBadRequest());
        // impossible coordinates
        report(token, body("OTHER", null, 95, 10, hoursAgo(1))).andExpect(status().isBadRequest());
        report(token, body("OTHER", null, 10, 200, hoursAgo(1))).andExpect(status().isBadRequest());
        // description too long
        report(token, body("OTHER", "x".repeat(501), 10, 10, hoursAgo(1))).andExpect(status().isBadRequest());
        // in the future
        report(token, body("OTHER", null, 10, 10, Instant.now().plus(1, ChronoUnit.HOURS)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The time of the incident can't be in the future."));
        // too long ago
        report(token, body("OTHER", null, 10, 10, Instant.now().minus(31, ChronoUnit.DAYS)))
                .andExpect(status().isBadRequest());

        // none of them was saved
        mockMvc.perform(get("/api/v1/incidents/mine").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void aFewMinutesOfPhoneClockDifferenceIsAccepted() throws Exception {
        Area area = newArea();
        report(newUserToken(), body("OTHER", null, area.lat() + 0.05, area.lon() + 0.05,
                Instant.now().plus(2, ChronoUnit.MINUTES)))
                .andExpect(status().isCreated());
    }

    @Test
    void reportsPerHourAreLimitedAndDeletingDoesNotResetTheLimit() throws Exception {
        String token = newUserToken();
        Area area = newArea();
        String firstId = null;
        for (int i = 0; i < 5; i++) {
            String created = report(token, body("OTHER", null, area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();
            if (firstId == null) firstId = json(created, "$.id");
        }
        report(token, body("OTHER", null, area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.title").value("Too many reports"));

        mockMvc.perform(delete("/api/v1/incidents/" + firstId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        report(token, body("OTHER", null, area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andExpect(status().isTooManyRequests());

        // Someone else is not affected.
        report(newUserToken(), body("OTHER", null, area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andExpect(status().isCreated());
    }

    // ---------- My reports and deleting ----------

    @Test
    void myReportsListsOnlyMyOwn() throws Exception {
        String me = newUserToken();
        Area area = newArea();
        report(me, body("HARASSMENT", "mine", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)));
        report(newUserToken(), body("OTHER", "someone else's", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)));

        mockMvc.perform(get("/api/v1/incidents/mine").header("Authorization", "Bearer " + me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].description").value("mine"));
    }

    @Test
    void deletingRemovesTheReportAndItsTextButOnlyForTheOwner() throws Exception {
        String owner = newUserToken();
        String stranger = newUserToken();
        Area area = newArea();
        String id = json(report(owner, body("OTHER", "private words", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(delete("/api/v1/incidents/" + id).header("Authorization", "Bearer " + stranger))
                .andExpect(status().isNotFound());
        map(stranger, area).andExpect(jsonPath("$.items", hasSize(1)));

        mockMvc.perform(delete("/api/v1/incidents/" + id).header("Authorization", "Bearer " + owner))
                .andExpect(status().isNoContent());
        map(stranger, area).andExpect(jsonPath("$.items", hasSize(0)));
        mockMvc.perform(get("/api/v1/incidents/mine").header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.items", hasSize(0)));
        String storedText = jdbc.queryForObject("SELECT description FROM incidents WHERE id = ?::uuid", String.class, id);
        assertThat(storedText).isNull();

        // Deleting twice is "not found", not an error.
        mockMvc.perform(delete("/api/v1/incidents/" + id).header("Authorization", "Bearer " + owner))
                .andExpect(status().isNotFound());
    }

    // ---------- Moderation ----------

    @Test
    void normalUsersCannotModerate() throws Exception {
        String token = newUserToken();
        mockMvc.perform(get("/api/v1/moderation/incidents").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/moderation/incidents/" + java.util.UUID.randomUUID())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"verificationStatus\":\"VERIFIED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void moderatorCanVerifyApproveTextAndHide() throws Exception {
        Area area = newArea();
        String reporter = newUserToken();
        String id = json(report(reporter, body("UNSAFE_CROWD", "Crowd near the gate", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andReturn().getResponse().getContentAsString(), "$.id");
        String moderator = moderatorToken();

        // It is in the review queue.
        String queue = mockMvc.perform(get("/api/v1/moderation/incidents").header("Authorization", "Bearer " + moderator))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(queue).contains(id);

        moderate(moderator, id, "{\"verificationStatus\":\"VERIFIED\",\"descriptionApproved\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.descriptionApproved").value(true));
        map(newUserToken(), area)
                .andExpect(jsonPath("$.items[0].verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.items[0].description").value("Crowd near the gate"))
                .andExpect(jsonPath("$.items[0].descriptionPending").value(false));

        moderate(moderator, id, "{\"moderationStatus\":\"HIDDEN\"}").andExpect(status().isOk());
        map(newUserToken(), area).andExpect(jsonPath("$.items", hasSize(0)));
        // The reporter can still see it, and that it was hidden.
        mockMvc.perform(get("/api/v1/incidents/mine").header("Authorization", "Bearer " + reporter))
                .andExpect(jsonPath("$.items[0].moderationStatus").value("HIDDEN"));
    }

    @Test
    void moderatorCanRemoveHarmfulText() throws Exception {
        Area area = newArea();
        String id = json(report(newUserToken(), body("OTHER", "His number is 98xxxxxx", area.lat() + 0.05, area.lon() + 0.05, hoursAgo(1)))
                .andReturn().getResponse().getContentAsString(), "$.id");

        moderate(moderatorToken(), id, "{\"removeDescription\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").doesNotExist());
        map(newUserToken(), area)
                .andExpect(jsonPath("$.items[0].description").doesNotExist())
                .andExpect(jsonPath("$.items[0].descriptionPending").value(false));
    }

    @Test
    void moderatingAnUnknownReportIsNotFound() throws Exception {
        moderate(moderatorToken(), java.util.UUID.randomUUID().toString(), "{\"verificationStatus\":\"VERIFIED\"}")
                .andExpect(status().isNotFound());
    }

    // ---------- Helpers ----------

    private String newUserToken() throws Exception {
        return json(register(uniqueEmail()), "$.accessToken");
    }

    /** A user promoted to MODERATOR in the database (the only way to get the role). */
    private String moderatorToken() throws Exception {
        String email = uniqueEmail();
        register(email);
        jdbc.update("UPDATE users SET role = 'MODERATOR' WHERE email = ?", email);
        return json(login(email), "$.accessToken");
    }

    private ResultActions report(String token, String json) throws Exception {
        return mockMvc.perform(post("/api/v1/incidents").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions map(String token, Area area) throws Exception {
        return mockMvc.perform(get("/api/v1/incidents?" + area.query()).with(uniqueIp())
                .header("Authorization", "Bearer " + token));
    }

    private ResultActions moderate(String token, String id, String json) throws Exception {
        return mockMvc.perform(patch("/api/v1/moderation/incidents/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(String category, String description, double lat, double lon, Instant occurredAt) {
        return """
                {"category":%s,"description":%s,"latitude":%s,"longitude":%s,"occurredAt":"%s"}
                """.formatted(category == null ? "null" : "\"" + category + "\"",
                description == null ? "null" : "\"" + description + "\"", lat, lon, occurredAt);
    }

    private static Instant hoursAgo(int hours) {
        return Instant.now().minus(hours, ChronoUnit.HOURS);
    }

    private static double roundTo3(double value) {
        return Math.round(value * 1000) / 1000.0;
    }
}
