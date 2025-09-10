-- This is an empty migration.
INSERT INTO public.roles ("name") VALUES
('PARTNER');
  
INSERT INTO public.permissions ("name","is_editable") VALUES
('read_partner', true),
('create_partner', true);


DO
$$
DECLARE
super_master_id  INT;
partner_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into partner_id from roles where name = 'PARTNER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_partner')), -- Super Master - read_partner
  (super_master_id,(select id from permissions where name = 'create_partner')), -- Super Master - create_partner

  (partner_id,(select id from permissions where name = 'read_own_profile')), -- Partner - read_own_profile
  (partner_id,(select id from permissions where name = 'read_dashboard')), -- Partner - read_dashboard
  (partner_id,(select id from permissions where name = 'read_statistics')), -- Partner - read_statistics
  (partner_id,(select id from permissions where name = 'read_statistics_vip')), -- Partner - read_statistics_vip
  (partner_id,(select id from permissions where name = 'read_statistics_user')), -- Partner - read_statistics_user
  (partner_id,(select id from permissions where name = 'read_statistics_user_activity')), -- Partner - read_statistics_user_activity
  (partner_id,(select id from permissions where name = 'read_statistics_funds_user')), -- Partner - read_statistics_funds_user
  (partner_id,(select id from permissions where name = 'read_statistics_funds_deposit')), -- Partner - read_statistics_funds_deposit
  (partner_id,(select id from permissions where name = 'read_statistics_funds_volume')), -- Partner - read_statistics_funds_volume
  (partner_id,(select id from permissions where name = 'read_statistics_funds_withdrawal')), -- Partner - read_statistics_funds_withdrawal
  (partner_id,(select id from permissions where name = 'read_fungamess_ggr')), -- Partner - read_fungamess_ggr
  (partner_id,(select id from permissions where name = 'read_sports_exchange_ggr')); -- Partner - read_sports_exchange_ggr

  END;
$$
LANGUAGE plpgsql;