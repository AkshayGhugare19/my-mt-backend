-- This is an empty migration.

INSERT INTO public.permissions ("name","is_editable") VALUES
('read_poker_ggr', true);

DO
$$
DECLARE
super_master_id  INT;
master_id  INT;

BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into master_id from roles where name = 'MASTER';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_poker_ggr')), -- SUPER_MASTER read_live_bets
  (master_id,(select id from permissions where name = 'read_poker_ggr')); -- MASTER read_live_bets
  END;
$$
LANGUAGE plpgsql;