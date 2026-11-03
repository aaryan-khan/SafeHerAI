-- V3: Incident reports shown on the safety map.
-- Reading only in Milestone 4. Creating reports comes in Milestone 5.

CREATE TABLE incidents (
    id                  UUID         PRIMARY KEY,
    category            VARCHAR(30)  NOT NULL
                        CHECK (category IN ('HARASSMENT', 'STALKING', 'POOR_LIGHTING', 'UNSAFE_CROWD', 'OTHER')),
    description         VARCHAR(500),
    -- Longitude/latitude point (WGS 84, the same system GPS and map tiles use).
    location            GEOMETRY(Point, 4326) NOT NULL,
    occurred_at         TIMESTAMPTZ  NOT NULL,
    verification_status VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED'
                        CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED')),
    -- TRUE for made-up test data. The API hides these unless INCLUDE_DEMO_DATA=true.
    is_demo             BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Who reported it (used from Milestone 5). NEVER returned by the API.
    reported_by         UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Spatial index: makes "which incidents are inside this map area?" fast.
CREATE INDEX ix_incidents_location    ON incidents USING GIST (location);
CREATE INDEX ix_incidents_occurred_at ON incidents (occurred_at DESC);
