-- This is an empty migration.
INSERT INTO public.permissions ("name","is_editable") VALUES
('read_games', true),
('edit_games', true);

DO
$$
DECLARE
super_master_id  INT;
marketing_id INT;
risk_management_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into marketing_id from roles where name = 'MARKETING';
  select id into risk_management_id from roles where name = 'RISK_MANAGEMENT';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_games')),
  (marketing_id,(select id from permissions where name = 'read_games')),
  (risk_management_id,(select id from permissions where name = 'read_games')),
  (super_master_id,(select id from permissions where name = 'edit_games')),
  (marketing_id,(select id from permissions where name = 'edit_games')),
  (risk_management_id,(select id from permissions where name = 'edit_games'));

  END;
$$
LANGUAGE plpgsql;-- This is an empty migration.