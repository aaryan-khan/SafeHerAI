-- V2: User accounts and refresh tokens.

CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    -- Stored trimmed and lower-cased by the application, so UNIQUE is case-insensitive.
    email         VARCHAR(254) NOT NULL UNIQUE,
    -- Only the BCrypt hash is stored, never the password itself.
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(50)  NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER'
                  CHECK (role IN ('USER', 'MODERATOR', 'ADMIN')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- All tokens from one login share a family. Reusing an old token revokes the whole family.
    family_id   UUID        NOT NULL,
    -- SHA-256 hash (hex) of the token. The token itself is never stored.
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX ix_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_family_id ON refresh_tokens (family_id);