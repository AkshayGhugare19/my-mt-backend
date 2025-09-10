-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_statistics_vip_own_activity', false),
('read_statistics_funds_vip_own_volume', false),
('read_statistics_funds_own_vip_token_issue', false),
('read_statistics_funds_vip_own', false);

DO
$$
DECLARE
master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'read_dashboard')), -- Master - read_statistics_vip_own_activity
  (master_id,(select id from permissions where name = 'read_statistics_vip')), -- Master - read_statistics_vip
  (master_id,(select id from permissions where name = 'read_statistics_funds_vip_own')), -- Master - read_statistics_funds_vip_own
  (master_id,(select id from permissions where name = 'read_statistics_funds_vip_own_volume')), -- Master - read_statistics_funds_vip_own_volume
  (master_id,(select id from permissions where name = 'read_statistics_funds_own_vip_token_issue')), -- Master - read_statistics_funds_own_vip_token_issue
  (master_id,(select id from permissions where name = 'read_statistics_vip_own_activity')); -- Master - read_statistics_vip_own_activity

  END;
$$
LANGUAGE plpgsql;