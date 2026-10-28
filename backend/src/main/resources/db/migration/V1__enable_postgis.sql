-- V1: Enable the PostGIS extension so we can store and query geographic data.
-- Flyway runs this exactly once and records it in flyway_schema_history.
CREATE EXTENSION IF NOT EXISTS postgis;