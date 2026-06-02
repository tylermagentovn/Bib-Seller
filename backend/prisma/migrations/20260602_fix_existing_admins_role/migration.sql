-- All admins existing before role-based access was introduced should be SUPER_ADMIN.
-- Since creating new admins requires SUPER_ADMIN, and no SUPER_ADMIN existed yet,
-- no legitimate EVENT_MANAGER accounts could have been created after the previous migration.
UPDATE "Admin" SET role = 'SUPER_ADMIN';
