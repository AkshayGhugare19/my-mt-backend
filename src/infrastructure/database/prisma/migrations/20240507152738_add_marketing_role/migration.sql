-- This is an empty migration.
INSERT INTO public.roles ("name") VALUES
('MARKETING');

INSERT INTO public.permissions ("name","is_editable") VALUES
-- Supermaster
('read_marketing', true),
('create_marketing', true);


DO
$$
DECLARE
super_master_id  INT;
marketing_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into marketing_id from roles where name = 'MARKETING';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_marketing')), -- Super Master - read_marketing
  (super_master_id,(select id from permissions where name = 'create_marketing')), -- Super Master - create_marketing

  (marketing_id,(select id from permissions where name = 'read_own_profile')), -- Marketing - read_own_profile
  (marketing_id,(select id from permissions where name = 'read_dashboard')), -- Super Master - read_dashboard
  (marketing_id,(select id from permissions where name = 'read_statistics')), -- Super Master - read_statistics
  (marketing_id,(select id from permissions where name = 'read_statistics_vip')), -- Super Master - read_statistics_vip
  (marketing_id,(select id from permissions where name = 'read_statistics_user')), -- Super Master - read_statistics_user
  (marketing_id,(select id from permissions where name = 'read_statistics_user_activity')), -- Super Master - read_statistics_user_activity
  (marketing_id,(select id from permissions where name = 'read_statistics_funds_user')), -- Super Master - read_statistics_funds_user
  (marketing_id,(select id from permissions where name = 'read_statistics_funds_deposit')), -- Super Master - read_statistics_funds_deposit
  (marketing_id,(select id from permissions where name = 'read_statistics_funds_volume')), -- Super Master - read_statistics_funds_volume
  (marketing_id,(select id from permissions where name = 'read_statistics_funds_withdrawal')), -- Super Master - read_statistics_funds_withdrawal
  (marketing_id,(select id from permissions where name = 'read_fungamess_ggr')), -- Super Master - read_fungamess_ggr
  (marketing_id,(select id from permissions where name = 'read_sports_exchange_ggr')); -- Super Master - read_sports_exchange_ggr

  END;
$$
LANGUAGE plpgsql;