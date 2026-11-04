-- V4: Users can report incidents (Milestone 5), moderators can check them.

ALTER TABLE incidents
    -- HIDDEN = removed from the map by a moderator (kept for the record).
    ADD COLUMN moderation_status    VARCHAR(20) NOT NULL DEFAULT 'VISIBLE'
                                    CHECK (moderation_status IN ('VISIBLE', 'HIDDEN')),
    -- Free text is only shown to others after a moderator has read it,
    -- so nobody can publish names, phone numbers or addresses on the map.
    ADD COLUMN description_approved BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN moderated_by         UUID        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN moderated_at         TIMESTAMPTZ,
    -- Set when the reporter deletes a report. The text is erased at the same moment;
    -- the empty row only remains so deleting can't be used to get around the report limits.
    ADD COLUMN deleted_at           TIMESTAMPTZ;

-- The made-up demo texts were written by us, so they count as approved.
UPDATE incidents SET description_approved = TRUE WHERE is_demo;

CREATE INDEX ix_incidents_reported_by ON incidents (reported_by, created_at DESC);
