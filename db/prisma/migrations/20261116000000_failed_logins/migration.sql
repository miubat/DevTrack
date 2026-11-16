CREATE TABLE failed_logins (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX failed_logins_email_time ON failed_logins (email, created_at);

GRANT SELECT, INSERT, DELETE ON failed_logins TO devtrack_app;
GRANT USAGE, SELECT ON SEQUENCE failed_logins_id_seq TO devtrack_app;