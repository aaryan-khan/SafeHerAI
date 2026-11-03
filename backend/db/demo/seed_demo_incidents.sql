-- ============================================================================
-- DEMO DATA ONLY. These are MADE-UP incidents for testing the map in Mumbai.
-- They do not describe anything that really happened. Every row has is_demo = TRUE,
-- and the app labels them "DEMO". Never run this on a production database.
--
-- Run (from the repo root, with Docker running):
--   docker exec -i safeherai-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/db/demo/seed_demo_incidents.sql
-- Safe to run again: it first deletes the old demo rows. Real rows are never touched.
-- ============================================================================
BEGIN;

DELETE FROM incidents WHERE is_demo;

-- Same "random" numbers every time, so everyone gets the same demo map.
SELECT setseed(0.42);

WITH anchors (n, lat, lon) AS (
    -- Rough centres of built-up land areas spread across Mumbai, so that random
    -- points land on land rather than in the sea. Points are scattered ~400 m around them.
    VALUES (0, 18.915, 72.826), (1, 18.940, 72.835), (2, 18.977, 72.833), (3, 18.996, 72.830),
           (4, 19.018, 72.843), (5, 19.058, 72.840), (6, 19.070, 72.880), (7, 19.062, 72.900),
           (8, 19.086, 72.908), (9, 19.119, 72.850), (10, 19.118, 72.910), (11, 19.165, 72.850),
           (12, 19.187, 72.850), (13, 19.230, 72.857), (14, 19.172, 72.956)
),
points AS (
    SELECT g,
           a.lat + (random() - 0.5) * 0.008 AS lat,
           a.lon + (random() - 0.5) * 0.008 AS lon,
           (ARRAY['HARASSMENT', 'STALKING', 'POOR_LIGHTING', 'UNSAFE_CROWD', 'OTHER'])[1 + floor(random() * 5)::int]
               AS category,
           random() AS verified_roll,
           random() AS age_roll
    FROM generate_series(0, 44) AS g
    JOIN anchors a ON a.n = g % 15
)
INSERT INTO incidents (id, category, description, location, occurred_at, verification_status, is_demo)
SELECT gen_random_uuid(),
       category,
       'DEMO: made-up report for testing the map. Not a real incident.',
       ST_SetSRID(ST_MakePoint(lon, lat), 4326),
       now() - age_roll * interval '60 days',
       CASE WHEN verified_roll < 0.3 THEN 'VERIFIED' ELSE 'UNVERIFIED' END,
       TRUE
FROM points;

SELECT count(*) AS demo_incidents FROM incidents WHERE is_demo;

COMMIT;
