INSERT INTO public.permissions ("name","is_editable") VALUES
('create_poker_rake', true);

DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'create_poker_rake')); -- SUPER_MASTER edit parameters

  END;
$$
LANGUAGE plpgsql;