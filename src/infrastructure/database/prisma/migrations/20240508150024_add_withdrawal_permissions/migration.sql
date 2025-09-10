INSERT INTO public.permissions ("name","is_editable") VALUES
-- Supermaster
('block_user_withdrawal', true);


DO
$$
DECLARE
risk_management_id  INT;
accountant_id  INT;
BEGIN
  select id into risk_management_id from roles where name = 'RISK_MANAGEMENT';
  select id into accountant_id from roles where name = 'ACCOUNTANT';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (risk_management_id,(select id from permissions where name = 'read_withdrawal')), -- RISK_MANAGEMENT - read_withdrawal
  (risk_management_id,(select id from permissions where name = 'edit_withdrawal')), -- RISK_MANAGEMENT - edit_withdrawal
  (risk_management_id,(select id from permissions where name = 'block_user_withdrawal')), -- RISK_MANAGEMENT - block_user_withdrawal

  (accountant_id,(select id from permissions where name = 'read_withdrawal')), -- ACCOUNTANT - read_withdrawal
  (accountant_id,(select id from permissions where name = 'close_withdrawal')), -- ACCOUNTANT - close_withdrawal
  (accountant_id,(select id from permissions where name = 'block_user_withdrawal')); -- ACCOUNTANT - block_user_withdrawal
  END;
$$
LANGUAGE plpgsql;