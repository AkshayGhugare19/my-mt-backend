-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_live_user', true);

DO
$$
DECLARE
master_id  INT;
super_master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';
  select id into super_master_id from roles where name = 'SUPER_MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_live_user')), -- SUPER MASTER 
  (master_id,(select id from permissions where name = 'read_live_user')); -- Master

  END;
$$
LANGUAGE plpgsql;