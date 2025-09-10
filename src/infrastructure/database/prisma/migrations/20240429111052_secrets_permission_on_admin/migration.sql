-- This is an empty migration

INSERT INTO public.permissions ("name","is_editable") VALUES
-- Supermaster
('edit_secret', false);

INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  ((select id from roles where name = 'SUPER_MASTER'),(select id from permissions where name = 'edit_secret')); -- Super Master - edit_secret

