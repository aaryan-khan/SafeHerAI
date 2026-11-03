-- Deletes ALL demo incidents (is_demo = TRUE). Real reports are never touched.
-- Run (from the repo root):
--   docker exec -i safeherai-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/db/demo/remove_demo_incidents.sql
DELETE FROM incidents WHERE is_demo;
