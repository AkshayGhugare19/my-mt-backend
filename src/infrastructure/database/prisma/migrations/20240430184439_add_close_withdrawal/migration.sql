-- This is an empty migration

-- close_withdrawal
INSERT INTO public.permissions ("name","is_editable") VALUES
('close_withdrawal', true);

INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  ((select id from roles where name = 'SUPER_MASTER'),(select id from permissions where name = 'close_withdrawal')); -- Super Master - close_withdrawal



