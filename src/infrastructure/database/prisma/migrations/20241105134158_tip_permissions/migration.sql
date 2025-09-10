-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_tips', true),
('read_own_vip_tips', true);

DO
$$
DECLARE
super_master_id  INT;
risk_management_id INT;
account_id INT;
master_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into risk_management_id from roles where name = 'RISK_MANAGEMENT';
  select id into account_id from roles where name = 'ACCOUNTANT';
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_tips')),
  (risk_management_id,(select id from permissions where name = 'read_tips')),
  (account_id,(select id from permissions where name = 'read_tips')),
  (master_id,(select id from permissions where name = 'read_own_vip_tips'));

  END;
$$
LANGUAGE plpgsql;