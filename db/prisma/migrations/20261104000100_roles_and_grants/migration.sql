DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'devtrack_app') THEN
    CREATE ROLE devtrack_app LOGIN PASSWORD 'devtrack_app';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO devtrack_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO devtrack_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO devtrack_app;

REVOKE UPDATE, DELETE ON activities FROM devtrack_app;

DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM devtrack_app;
  END IF;
END
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO devtrack_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO devtrack_app;
