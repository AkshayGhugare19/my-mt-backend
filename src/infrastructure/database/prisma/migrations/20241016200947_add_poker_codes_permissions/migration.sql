-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_poker_codes', true),
('create_poker_codes', true),
('edit_poker_codes', true);

DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_poker_codes')), -- SUPER_MASTER read poker codes
  (super_master_id,(select id from permissions where name = 'create_poker_codes')), -- SUPER_MASTER create poker codes
  (super_master_id,(select id from permissions where name = 'edit_poker_codes')); -- SUPER_MASTER edit poker codes

  END;
$$
LANGUAGE plpgsql;

