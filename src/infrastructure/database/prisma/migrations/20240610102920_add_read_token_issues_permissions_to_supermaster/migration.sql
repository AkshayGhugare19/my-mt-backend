-- This is an empty migration.-- This is an empty migration.-- This is an empty migration.
DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE permission_id = (SELECT id FROM public.permissions WHERE name = 'read_token_requests_master') 
      AND role_id = super_master_id) 
  THEN
    INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
    (super_master_id, (SELECT id FROM public.permissions WHERE name = 'read_token_requests_master'));
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions 
      WHERE permission_id = (SELECT id FROM public.permissions WHERE name = 'read_token_requests_vip') 
      AND role_id = super_master_id) 
  THEN
    INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
    (super_master_id, (SELECT id FROM public.permissions WHERE name = 'read_token_requests_vip') );
  END IF;

  END;
$$
LANGUAGE plpgsql;