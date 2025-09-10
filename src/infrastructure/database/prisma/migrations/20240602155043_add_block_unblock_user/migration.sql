-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('block_user', true),
('read_blocked_users', true),
('block_vip_own', true),
('read_blocked_vip_own', true);

DO
$$
DECLARE
super_master_id  INT;
master_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'block_user')), -- SUPER MASTER
  (super_master_id,(select id from permissions where name = 'read_blocked_users')), -- SUPER MASTER
  (master_id,(select id from permissions where name = 'block_vip_own')), -- MASTER
  (master_id,(select id from permissions where name = 'read_blocked_vip_own')); -- MASTER


  END;
$$
LANGUAGE plpgsql;