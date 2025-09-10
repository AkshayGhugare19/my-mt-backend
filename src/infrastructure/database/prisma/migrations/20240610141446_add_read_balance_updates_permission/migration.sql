-- This is an empty migration.-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_own_balance_adjustments', false),
('read_balance_adjustments', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'read_own_balance_adjustments')), -- MASTER read_own_balance_adjustments
  (super_master_id,(select id from permissions where name = 'read_balance_adjustments')); -- MASTER read_balance_adjustments

  END;
$$
LANGUAGE plpgsql;