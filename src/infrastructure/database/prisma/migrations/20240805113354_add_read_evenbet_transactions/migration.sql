-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_evenbet_transactions', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;

BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_evenbet_transactions')), -- SUPER_MASTER
  (master_id,(select id from permissions where name = 'read_evenbet_transactions')); -- MASTER
  END;
$$
LANGUAGE plpgsql;