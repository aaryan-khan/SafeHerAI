package com.safeherai.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DatabaseIntegrationTest extends IntegrationTest {

    @Test
    void flywayAppliedAllMigrations() {
        Integer applied = jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success AND version IN ('1', '2')", Integer.class);
        assertThat(applied).isEqualTo(2);
    }

    @Test
    void postgisExtensionIsInstalled() {
        String version = jdbc.queryForObject("SELECT postgis_lib_version()", String.class);
        assertThat(version).startsWith("3.");
    }

    @Test
    void postgisCalculatesRealWorldDistance() {
        // India Gate -> Connaught Place, New Delhi. Note: PostGIS uses (longitude, latitude) order.
        Double metres = jdbc.queryForObject("""
                SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint(77.2295, 28.6129), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(77.2167, 28.6315), 4326)::geography)
                """, Double.class);
        // Straight-line distance is roughly 2.4 km
        assertThat(metres).isBetween(2_300.0, 2_500.0);
    }
}