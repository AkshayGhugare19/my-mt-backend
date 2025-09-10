-- This is an empty migration.-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('edit_balance', true);

DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'edit_balance')); -- MASTER edit_own_vip_password

  END;
$$
LANGUAGE plpgsql;