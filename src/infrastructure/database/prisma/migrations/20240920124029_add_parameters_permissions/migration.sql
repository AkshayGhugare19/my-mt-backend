-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_parameters', true),
('edit_parameters', true);

DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_parameters')), -- SUPER_MASTER read parameters
  (super_master_id,(select id from permissions where name = 'edit_parameters')); -- SUPER_MASTER edit parameters

  END;
$$
LANGUAGE plpgsql;