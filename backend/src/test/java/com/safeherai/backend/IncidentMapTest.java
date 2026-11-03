package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.safeherai.backend.incident.BoundingBox;
import com.safeherai.backend.incident.IncidentRepository;
import com.safeherai.backend.incident.IncidentResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * The safety map API. All data here is inserted by the tests themselves.
 * Each test uses its own small area of the map, so tests never see each other's incidents.
 */
class IncidentMapTest extends IntegrationTest {

    @Autowired
    IncidentRepository repository;

    private String token;

    @BeforeEach
    void logIn() throws Exception {
        token = json(register(uniqueEmail()), "$.accessToken");
    }

    // ---------- Access ----------

    @Test
    void mapRequiresLogin() throws Exception {
        mockMvc.perform(get("/api/v1/incidents").with(uniqueIp())
                        .param("minLon", "72.8").param("minLat", "19.0")
                        .param("maxLon", "72.9").param("maxLat", "19.1"))
                .andExpect(status().isUnauthorized());
    }

    // ---------- What comes back ----------

    @Test
    void returnsOnlyIncidentsInsideTheArea() throws Exception {
        UUID inside = insert(10.05, 10.05, "HARASSMENT", false, hoursAgo(1));
        UUID alsoInside = insert(10.09, 10.01, "STALKING", false, hoursAgo(2));
        insert(10.15, 10.05, "OTHER", false, hoursAgo(3)); // just east of the box

        query(10.0, 10.0, 10.1, 10.1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].id", contains(inside.toString(), alsoInside.toString())))
                .andExpect(jsonPath("$.truncated").value(false));
    }

    @Test
    void incidentHasMapFieldsButNothingAboutTheReporter() throws Exception {
        String reporterEmail = uniqueEmail();
        String reporterId = json(register(reporterEmail), "$.user.id");
        UUID id = insert(11.02, 11.03, "POOR_LIGHTING", true, hoursAgo(5));
        jdbc.update("UPDATE incidents SET reported_by = ?::uuid, verification_status = 'VERIFIED' WHERE id = ?",
                reporterId, id);

        String body = query(11.0, 11.0, 11.1, 11.1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(id.toString()))
                .andExpect(jsonPath("$.items[0].category").value("POOR_LIGHTING"))
                .andExpect(jsonPath("$.items[0].latitude").value(11.03))
                .andExpect(jsonPath("$.items[0].longitude").value(11.02))
                .andExpect(jsonPath("$.items[0].verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.items[0].isDemo").value(true))
                .andExpect(jsonPath("$.items[0].occurredAt").isString())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(reporterId).doesNotContain(reporterEmail)
                .doesNotContainIgnoringCase("reported");
    }

    @Test
    void newestIncidentsComeFirst() throws Exception {
        UUID old = insert(12.01, 12.01, "OTHER", false, hoursAgo(48));
        UUID recent = insert(12.02, 12.02, "OTHER", false, hoursAgo(1));
        UUID middle = insert(12.03, 12.03, "OTHER", false, hoursAgo(10));

        query(12.0, 12.0, 12.1, 12.1)
                .andExpect(jsonPath("$.items[*].id",
                        contains(recent.toString(), middle.toString(), old.toString())));
    }

    @Test
    void returnsAtMost300AndSaysWhenThereAreMore() throws Exception {
        jdbc.update("""
                INSERT INTO incidents (id, category, location, occurred_at)
                SELECT gen_random_uuid(), 'OTHER', ST_SetSRID(ST_MakePoint(13.05, 13.05), 4326), now()
                FROM generate_series(1, 301)
                """);

        query(13.0, 13.0, 13.1, 13.1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(300)))
                .andExpect(jsonPath("$.truncated").value(true));
    }

    @Test
    void emptyAreaReturnsAnEmptyList() throws Exception {
        query(14.0, 14.0, 14.1, 14.1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.truncated").value(false));
    }

    // ---------- Demo data ----------

    @Test
    void demoIncidentsAreHiddenWhenDemoDataIsOff() {
        insert(15.01, 15.01, "OTHER", true, hoursAgo(1));
        UUID real = insert(15.02, 15.02, "OTHER", false, hoursAgo(2));
        BoundingBox box = BoundingBox.of(15.0, 15.0, 15.1, 15.1);

        List<IncidentResponse> withoutDemo = repository.findInBox(box, false, 10);
        assertThat(withoutDemo).extracting(IncidentResponse::id).containsExactly(real);
        assertThat(repository.findInBox(box, true, 10)).hasSize(2);
    }

    // ---------- Bad requests ----------

    @Test
    void invalidAreasAreRejected() throws Exception {
        // min not smaller than max
        query(10.1, 10.0, 10.0, 10.1).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid map area"));
        // outside the valid range
        query(-200, 10.0, 10.0, 10.1).andExpect(status().isBadRequest());
        query(10.0, 89.5, 10.1, 95.0).andExpect(status().isBadRequest());
        // far too big (a whole country)
        query(68.0, 8.0, 97.0, 37.0).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("This map area is too large. Zoom in and try again."));
    }

    @Test
    void nonNumbersAndMissingValuesAreRejected() throws Exception {
        mockMvc.perform(get("/api/v1/incidents").with(uniqueIp()).header("Authorization", "Bearer " + token)
                        .param("minLon", "NaN").param("minLat", "10").param("maxLon", "10.1").param("maxLat", "10.1"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/incidents").with(uniqueIp()).header("Authorization", "Bearer " + token)
                        .param("minLon", "abc").param("minLat", "10").param("maxLon", "10.1").param("maxLat", "10.1"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/incidents").with(uniqueIp()).header("Authorization", "Bearer " + token)
                        .param("minLon", "10"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void tooManyMapQueriesFromOneAddressAreBlocked() throws Exception {
        RequestPostProcessor sameIp = uniqueIp();
        // The test profile allows 10 map queries per minute per address.
        for (int i = 0; i < 10; i++) {
            query(sameIp, 16.0, 16.0, 16.1, 16.1).andExpect(status().isOk());
        }
        query(sameIp, 16.0, 16.0, 16.1, 16.1)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    // ---------- Database rules ----------

    @Test
    void databaseRejectsUnknownCategories() {
        org.junit.jupiter.api.Assertions.assertThrows(DataIntegrityViolationException.class,
                () -> insert(17.0, 17.0, "MADE_UP", false, hoursAgo(1)));
    }

    // ---------- Helpers ----------

    private ResultActions query(double minLon, double minLat, double maxLon, double maxLat) throws Exception {
        return query(uniqueIp(), minLon, minLat, maxLon, maxLat);
    }

    private ResultActions query(RequestPostProcessor ip, double minLon, double minLat, double maxLon, double maxLat)
            throws Exception {
        return mockMvc.perform(get("/api/v1/incidents").with(ip).header("Authorization", "Bearer " + token)
                .param("minLon", String.valueOf(minLon)).param("minLat", String.valueOf(minLat))
                .param("maxLon", String.valueOf(maxLon)).param("maxLat", String.valueOf(maxLat)));
    }

    private UUID insert(double lon, double lat, String category, boolean demo, Instant occurredAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO incidents (id, category, description, location, occurred_at, is_demo)
                VALUES (?, ?, 'Test incident', ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?)
                """, id, category, lon, lat, Timestamp.from(occurredAt), demo);
        return id;
    }

    private static Instant hoursAgo(int hours) {
        return Instant.now().minus(hours, ChronoUnit.HOURS);
    }
}
