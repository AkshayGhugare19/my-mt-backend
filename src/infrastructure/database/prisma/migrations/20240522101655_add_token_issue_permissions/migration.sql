-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('edit_token_requests_master', false),
('create_token_requests_master_own', false);

UPDATE public.permissions SET "name" = 'edit_token_requests_vip' WHERE name = 'edit_token_requests';

DO
$$
DECLARE
master_id  INT;
super_master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';
  select id into super_master_id from roles where name = 'SUPER_MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'edit_token_requests_master')), -- SUPER MASTER - edit_token_requests_master
  (master_id,(select id from permissions where name = 'create_token_requests_master_own')); -- Master - read_statistics_vip_own_activity

  END;
$$
LANGUAGE plpgsql;