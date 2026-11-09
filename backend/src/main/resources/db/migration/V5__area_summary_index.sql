-- V5: Area summaries (Milestone 6) ask "which reports are within 500 metres of here?".
-- Real distances need the geography type; this index makes that question fast.
CREATE INDEX ix_incidents_location_geography ON incidents USING GIST ((location::geography));
