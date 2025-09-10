-- This is an empty migration.

DELETE FROM public.role_permissions WHERE permission_id = (SELECT id FROM public.permissions WHERE name = 'read_own_profile');

