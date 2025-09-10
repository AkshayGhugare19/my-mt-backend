-- This is an empty migration.
INSERT INTO public.permissions ("name","is_editable") VALUES
('edit_avatars', true);

DO
$$
DECLARE
super_master_id  INT;
marketing_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into marketing_id from roles where name = 'MARKETING';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'edit_avatars')),
  (marketing_id,(select id from permissions where name = 'edit_avatars'));

  END;
$$
LANGUAGE plpgsql;