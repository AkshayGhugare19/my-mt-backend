-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_live_bets', true),
('read_own_live_bets', true);

DO
$$
DECLARE
super_master_id  INT;
risk_management_id  INT;

BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into risk_management_id from roles where name = 'RISK_MANAGEMENT';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_live_bets')), -- SUPER_MASTER read_live_bets
  (risk_management_id,(select id from permissions where name = 'read_live_bets')); -- RISK_MANAGEMENT read_live_bets
  END;
$$
LANGUAGE plpgsql;