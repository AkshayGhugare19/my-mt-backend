-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_bonus', true),
('read_user_bonus', true),
('read_own_user_bonus', true),
('create_bonus', true),
('edit_bonus', true),
('edit_user_bonus', true);

DO
$$
DECLARE
super_master_id  INT;
risk_management_id  INT;

BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_bonus')), -- SUPER_MASTER read_bonus
  (super_master_id,(select id from permissions where name = 'read_user_bonus')), -- SUPER_MASTER read_user_bonus
  (super_master_id,(select id from permissions where name = 'read_own_user_bonus')), -- SUPER_MASTER read_own_user_bonus
  (super_master_id,(select id from permissions where name = 'create_bonus')), -- SUPER_MASTER create_bonus
  (super_master_id,(select id from permissions where name = 'edit_bonus')), -- SUPER_MASTER edit_bonus
  (super_master_id,(select id from permissions where name = 'edit_user_bonus')); -- SUPER_MASTER edit_user_bonus
  END;
$$
LANGUAGE plpgsql;