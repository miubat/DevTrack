DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'devtrack_app') THEN
    DROP OWNED BY devtrack_app;
    DROP ROLE devtrack_app;
  END IF;
END
$$;
