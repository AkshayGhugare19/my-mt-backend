-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_ngr', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;
marketing_id  INT;
partner_id  INT;

BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';
  select id into marketing_id from roles where name = 'MARKETING';
  select id into partner_id from roles where name = 'PARTNER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_ngr')), -- SUPER_MASTER read_ngr
  (master_id,(select id from permissions where name = 'read_ngr')), -- MASTER read_ngr
  (marketing_id,(select id from permissions where name = 'read_ngr')), -- MARKETING read_ngr
  (partner_id,(select id from permissions where name = 'read_ngr')); -- PARTNER read_ngr
  END;
$$
LANGUAGE plpgsql;