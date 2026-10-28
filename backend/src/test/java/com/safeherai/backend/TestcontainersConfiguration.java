package com.safeherai.backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Starts a throwaway PostGIS database in Docker for tests.
 * @ServiceConnection points Spring's datasource at it automatically,
 * so tests never touch your local development database.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    static final DockerImageName POSTGIS_IMAGE =
            DockerImageName.parse("postgis/postgis:17-3.5").asCompatibleSubstituteFor("postgres");

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgisContainer() {
        return new PostgreSQLContainer(POSTGIS_IMAGE);
    }
}