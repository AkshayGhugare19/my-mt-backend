-- This is an empty migration.
INSERT INTO public.roles ("name") VALUES
('ACCOUNTANT'),
('CUSTOMER_SUPPORT');

INSERT INTO public.permissions ("name","is_editable") VALUES
-- Supermaster
('read_risk_management', true),
('create_risk_management', true),
('read_customer_support', true),
('create_customer_support', true),
('read_accountant', true),
('create_accountant', true),
-- Customer Support
('read_customer_support_ticket', true);

DO
$$
DECLARE
super_master_id  INT;
customer_support INT;
risk_management_id  INT;
accountant_id  INT;
BEGIN
  select id into risk_management_id from roles where name = 'RISK_MANAGEMENT';
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into accountant_id from roles where name = 'ACCOUNTANT';
  select id into customer_support from roles where name = 'CUSTOMER_SUPPORT';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_risk_management')), -- Super Master - read_risk_management
  (super_master_id,(select id from permissions where name = 'create_risk_management')), -- Super Master - create_risk_management
  (super_master_id,(select id from permissions where name = 'read_customer_support')), -- Super Master - read_customer_support
  (super_master_id,(select id from permissions where name = 'create_customer_support')), -- Super Master - create_customer_support
  (super_master_id,(select id from permissions where name = 'read_accountant')), -- Super Master - read_accountant
  (super_master_id,(select id from permissions where name = 'create_accountant')), -- Super Master - create_accountant

  (risk_management_id,(select id from permissions where name = 'edit_own_password')), -- Risk Management - edit_own_password
  (risk_management_id,(select id from permissions where name = 'read_own_profile')), -- Risk Management - read_own_profile
  (accountant_id,(select id from permissions where name = 'edit_own_password')), -- Accountant - edit_own_password
  (accountant_id,(select id from permissions where name = 'read_own_profile')), -- Accountant - read_own_profile
  (customer_support,(select id from permissions where name = 'edit_own_password')), -- Customer Support - edit_own_password
  (customer_support,(select id from permissions where name = 'read_own_profile')), -- Customer Support - read_own_profile
  (customer_support,(select id from permissions where name = 'read_customer_support_ticket')); -- Customer Support - read_customer_support_ticket
  END;
$$
LANGUAGE plpgsql;