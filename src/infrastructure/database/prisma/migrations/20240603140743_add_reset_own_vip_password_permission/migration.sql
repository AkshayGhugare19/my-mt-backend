-- This is an empty migration.-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('edit_own_vip_password', true);

DO
$$
DECLARE
master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'edit_own_vip_password')); -- MASTER edit_own_vip_password

  END;
$$
LANGUAGE plpgsql;