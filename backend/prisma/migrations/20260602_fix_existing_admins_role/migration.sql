-- All admins existing before role-based access was introduced should be SUPER_ADMIN.
-- Wrapped in DO/EXCEPTION to be safe on fresh deployments where the role column
-- may not exist yet due to migration ordering with mixed timestamp formats.
DO $$
BEGIN
  UPDATE "Admin" SET "role" = 'SUPER_ADMIN';
EXCEPTION WHEN undefined_column THEN
  NULL;
END;
$$;
