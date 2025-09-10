INSERT INTO public.permissions ("name","is_editable") VALUES
('read_coupon_codes', true),
('create_coupon_codes', true),
('edit_coupon_codes', true);

DO
$$
DECLARE
super_master_id  INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_coupon_codes')),
  (super_master_id,(select id from permissions where name = 'create_coupon_codes')),
  (super_master_id,(select id from permissions where name = 'edit_coupon_codes'));

  END;
$$
LANGUAGE plpgsql;