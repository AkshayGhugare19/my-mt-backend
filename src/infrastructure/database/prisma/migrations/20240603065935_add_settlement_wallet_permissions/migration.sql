-- This is an empty migration.-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_settlement_wallet', true),
('read_withdrawal_wallet', true),
('read_deposit_wallet', true),
('read_own_wallet', true),
('edit_own_wallet', true);

DO
$$
DECLARE
master_id  INT;
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'edit_own_wallet')), -- MASTER edit_own_wallet
  (master_id,(select id from permissions where name = 'read_own_wallet')), -- MASTER read_own_wallet
  (master_id,(select id from permissions where name = 'read_settlement_wallet')), -- MASTER read_settlement_wallet
  (super_master_id,(select id from permissions where name = 'read_settlement_wallet')), -- SUPER MASTER read_settlement_wallet
  (super_master_id,(select id from permissions where name = 'read_withdrawal_wallet')), -- SUPER MASTER read_withdrawal_wallet
  (super_master_id,(select id from permissions where name = 'read_deposit_wallet')); -- SUPER MASTER read_deposit_wallet

  END;
$$
LANGUAGE plpgsql;