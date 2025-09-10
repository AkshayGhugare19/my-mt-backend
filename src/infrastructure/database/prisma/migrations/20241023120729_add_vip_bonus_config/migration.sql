-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_bonus_enabled" BOOLEAN;

INSERT INTO public.permissions ("name","is_editable") VALUES
('edit_vip_preferences', true),
('edit_own_vip_preferences', true),
('edit_vip_bonus_preferences', true);

DO
$$
DECLARE
master_id  INT;
BEGIN
  select id into master_id from roles where name = 'MASTER';
  
  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (master_id,(select id from permissions where name = 'edit_vip_bonus_preferences')), -- MASTER edit parameters
  (master_id,(select id from permissions where name = 'edit_own_vip_preferences')); -- MASTER edit parameters

  END;
$$
LANGUAGE plpgsql;