-- This is an empty migration.

INSERT INTO public.permissions ("id","name") VALUES
(33,'edit_own_password');

INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
(1,33),
(2,33);

UPDATE public.permissions SET "name" = 'read_super_master_own_details' WHERE "id" = 9;
UPDATE public.permissions SET "name" = 'read_master_own_details' WHERE "id" = 8;