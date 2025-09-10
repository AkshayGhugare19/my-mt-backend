-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_deposits_reports', true),
('read_withdrawals_reports', true),
('read_bets_reports', true),
('read_own_bets_reports', true),
('read_settlements_reports', true),
('read_own_settlements_reports', true),
('read_top_ups_reports', true),
('read_own_top_ups_reports', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_deposits_reports')), -- SUPER_MASTER read_deposits_reports
  (master_id,(select id from permissions where name = 'read_deposits_reports')), -- MASTER read_deposits_reports
  (super_master_id,(select id from permissions where name = 'read_withdrawals_reports')), -- SUPER_MASTER read_withdrawals_reports
  (master_id,(select id from permissions where name = 'read_withdrawals_reports')), -- MASTER read_withdrawals_reports
  (super_master_id,(select id from permissions where name = 'read_bets_reports')), -- SUPER_MASTER read_bets_reports
  (master_id,(select id from permissions where name = 'read_own_bets_reports')), -- MASTER read_bets_reports
  (super_master_id,(select id from permissions where name = 'read_settlements_reports')), -- SUPER_MASTER read_settlements_reports
  (master_id,(select id from permissions where name = 'read_own_settlements_reports')), -- MASTER read_own_settlements_reports
  (super_master_id,(select id from permissions where name = 'read_top_ups_reports')), -- SUPER_MASTER read_top_ups_reports
  (master_id,(select id from permissions where name = 'read_own_top_ups_reports')); -- MASTER read_own_top_ups_reports
  END;
$$
LANGUAGE plpgsql;