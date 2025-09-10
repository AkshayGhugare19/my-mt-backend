-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_statistics_funds_own_token_settlement', false),
('read_statistics_funds_token_settlement', true);

DO
$$
DECLARE
master_id  INT;
super_master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';
  select id into super_master_id from roles where name = 'SUPER_MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'read_statistics_funds_own_token_settlement')), -- Master - read_statistics_vip_own_activity
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_token_settlement')); -- Master - read_statistics_vip_own_activity

  END;
$$
LANGUAGE plpgsql;