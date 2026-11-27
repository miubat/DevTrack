-- AGL-08.4: one row per signed-in device. Access tokens carry the session id, so
-- signing out or a password change ends the access token at once, not after 15 min.
CREATE TABLE sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX sessions_user ON sessions (user_id);

-- Each refresh token belongs to a session. Tokens from before this change have none.
ALTER TABLE refresh_tokens ADD COLUMN session_id BIGINT NULL REFERENCES sessions(id);

-- Refresh tokens from before this change belong to no session, so end them:
-- everyone signs in once more after the deploy.
UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON sessions TO devtrack_app;
GRANT USAGE, SELECT ON SEQUENCE sessions_id_seq TO devtrack_app;
