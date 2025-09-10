-- This is an empty migration.

TRUNCATE TABLE public.permissions RESTART IDENTITY CASCADE;

INSERT INTO public.permissions ("name","is_editable") VALUES
-- Supermaster
('read_roles', false),
('read_permissions', false),
('edit_permissions', false),
('read_supermaster_details', false),
-- Master
---- READ
('read_master', true),
('read_master_own_details', false),
('read_master_details', true),
('read_master_pnl', true),
('read_master_nrusers', true),
('read_master_maxexposurepervip', true),
('read_master_maxnumberusers', true),
---- CREATE
('create_master', true),
---- EDIT
('edit_master_maxexposurepervip', true),
('edit_master_maxnumberusers', true),
('read_dashboard', true),

-- User
---- READ
('read_user', true),
('read_own_profile', true),
('read_all_user', false),
('read_user_details', true),
('read_user_maxbet', true),
('read_user_withdrawal_availability', true),
---- EDIT
('edit_own_password', false),
('edit_user_maxbet', true),
('edit_user_withdrawal_availability', true),

-- Balance
('read_own_balance', true),

-- VIP
---- READ
('read_vip', true),
('read_vip_own', false),
('read_vip_details', true),
('read_vip_maxbet', true),
---- CREATE
('create_vip', true),
---- EDIT
('edit_vip_maxbet', true),

-- Withdrawal
---- READ
('read_withdrawal', true),

---- EDIT
('edit_withdrawal', true),

-- Settlement
---- READ
('read_settlements', true),
('read_settlements_vip', true),
('read_settlements_smm', true),
('read_settlements_smm_own', true),

---- CREATE
('create_settlements_vip', true),
('create_settlements_smm', true),
('create_settlements_smm_own', true),

---- EDIT
('edit_settlements_vip', true),
('edit_settlements_smm', true),
('edit_settlements_smm_own', true),

-- Statistics
---- READ
('read_statistics', true),
('read_statistics_vip', true),
('read_statistics_user', true),
('read_fungamess_ggr', true),
('read_sports_exchange_ggr', true),
('read_statistics_user_activity', true),
('read_statistics_funds_user', true),
('read_statistics_funds_deposit', true),
('read_statistics_funds_volume', true),
('read_statistics_funds_withdrawal', true),
('read_statistics_funds_token_issue', true),


-- Token
---- READ
('read_token_requests', true),
('read_token_requests_vip', true),
('read_token_requests_master', true),

---- EDIT
('edit_token_requests', true),

---- CREATE
('create_token_requests_vip', true),
('create_token_requests_master', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_roles')), -- Super Master - read_roles
  (super_master_id,(select id from permissions where name = 'read_permissions')), -- Super Master - read_permissions
  (super_master_id,(select id from permissions where name = 'edit_permissions')), -- Super Master - edit_permissions
  (super_master_id,(select id from permissions where name = 'read_supermaster_details')), -- Super Master - read_supermaster_details
  (super_master_id,(select id from permissions where name = 'read_own_profile')), -- Super Master - read_own_profile
  (super_master_id,(select id from permissions where name = 'read_master')), -- Super Master - read_master
  (super_master_id,(select id from permissions where name = 'read_master_details')), -- Super Master - read_master_details
  (super_master_id,(select id from permissions where name = 'read_master_pnl')), -- Super Master - read_master_pnl
  (super_master_id,(select id from permissions where name = 'read_master_nrusers')), -- Super Master - read_master_nrusers
  (super_master_id,(select id from permissions where name = 'read_master_maxexposurepervip')), -- Super Master - read_master_maxexposurepervip
  (super_master_id,(select id from permissions where name = 'read_master_maxnumberusers')), -- Super Master - read_master_maxnumberusers
  (super_master_id,(select id from permissions where name = 'create_master')), -- Super Master - create_master
  (super_master_id,(select id from permissions where name = 'edit_master_maxexposurepervip')), -- Super Master - edit_master_maxexposurepervip
  (super_master_id,(select id from permissions where name = 'edit_master_maxnumberusers')), -- Super Master - edit_master_maxnumberusers
  (super_master_id,(select id from permissions where name = 'read_user')), -- Super Master - read_user
  (super_master_id,(select id from permissions where name = 'read_all_user')), -- Super Master - read_user
  (super_master_id,(select id from permissions where name = 'read_user_details')), -- Super Master - read_user_details
  (super_master_id,(select id from permissions where name = 'read_user_maxbet')), -- Super Master - read_user_maxbet
  (super_master_id,(select id from permissions where name = 'read_user_withdrawal_availability')), -- Super Master - read_user_withdrawal_availability
  (super_master_id,(select id from permissions where name = 'edit_own_password')), -- Super Master - edit_own_password
  (super_master_id,(select id from permissions where name = 'edit_user_withdrawal_availability')), -- Super Master - edit_user_withdrawal_availability
  (super_master_id,(select id from permissions where name = 'read_vip')), -- Super Master - read_vip
  (super_master_id,(select id from permissions where name = 'read_vip_details')), -- Super Master - read_vip_details
  (super_master_id,(select id from permissions where name = 'read_vip_maxbet')), -- Super Master - read_vip_maxbet
  (super_master_id,(select id from permissions where name = 'edit_vip_maxbet')), -- Super Master - edit_vip_maxbet
  (super_master_id,(select id from permissions where name = 'read_token_requests')), -- Super Master - read_token_requests
  (super_master_id,(select id from permissions where name = 'create_token_requests_master')), -- Super Master - create_token_requests_master
  (super_master_id,(select id from permissions where name = 'read_settlements')), -- Super Master - read_settlements
  (super_master_id,(select id from permissions where name = 'read_settlements_smm')), -- Super Master - read_settlements_smm
  (super_master_id,(select id from permissions where name = 'edit_settlements_smm')), -- Super Master - edit_settlements_smm
  (super_master_id,(select id from permissions where name = 'create_settlements_smm')), -- Super Master - create_settlements_smm
  (super_master_id,(select id from permissions where name = 'read_statistics')), -- Super Master - read_statistics
  (super_master_id,(select id from permissions where name = 'read_statistics_vip')), -- Super Master - read_statistics_vip
  (super_master_id,(select id from permissions where name = 'read_statistics_user')), -- Super Master - read_statistics_user
  (super_master_id,(select id from permissions where name = 'read_statistics_user_activity')), -- Super Master - read_statistics_user_activity
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_user')), -- Super Master - read_statistics_funds_user
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_deposit')), -- Super Master - read_statistics_funds_deposit
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_volume')), -- Super Master - read_statistics_funds_volume
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_withdrawal')), -- Super Master - read_statistics_funds_withdrawal
  (super_master_id,(select id from permissions where name = 'read_statistics_funds_token_issue')), -- Super Master - read_statistics_funds_token_issue
  (super_master_id,(select id from permissions where name = 'read_fungamess_ggr')), -- Super Master - read_fungamess_ggr
  (super_master_id,(select id from permissions where name = 'read_sports_exchange_ggr')), -- Super Master - read_sports_exchange_ggr
  (super_master_id,(select id from permissions where name = 'read_withdrawal')), -- Super Master - read_withdrawal
  (super_master_id,(select id from permissions where name = 'edit_withdrawal')), -- Super Master - edit_withdrawal
  (super_master_id,(select id from permissions where name = 'read_dashboard')), -- Super Master - read_dashboard
  (master_id,(select id from permissions where name = 'edit_own_password')), -- Master - edit_own_password
  (master_id,(select id from permissions where name = 'read_master_own_details')), -- Master - read_master_own_details
  (master_id,(select id from permissions where name = 'create_vip')), -- Master - create_vip
  (master_id,(select id from permissions where name = 'read_vip_own')), -- Master - read_vip_own
  (master_id,(select id from permissions where name = 'read_own_profile')), -- Master - read_own_profile
  (master_id,(select id from permissions where name = 'edit_vip_maxbet')), -- Master - edit_vip_maxbet
  (master_id,(select id from permissions where name = 'read_token_requests')), -- Master - read_token_requests
  (master_id,(select id from permissions where name = 'create_token_requests_vip')), -- Master - create_token_requests_vip
  (master_id,(select id from permissions where name = 'edit_token_requests')), -- Master - edit_token_requests
  (master_id,(select id from permissions where name = 'read_settlements_vip')), -- Master - read_settlements_vip
  (master_id,(select id from permissions where name = 'edit_settlements_vip')), -- Master - edit_settlements_vip
  (master_id,(select id from permissions where name = 'read_settlements_smm_own')), -- Master - read_settlements_smm_own
  (master_id,(select id from permissions where name = 'edit_settlements_smm_own')), -- Master - edit_settlements_smm_own
  (master_id,(select id from permissions where name = 'create_settlements_smm_own')); -- Master - create_settlements_smm_own
  END;
$$
LANGUAGE plpgsql;