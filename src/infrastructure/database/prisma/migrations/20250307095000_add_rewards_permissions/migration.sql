-- AlterTable
ALTER TABLE "rewards" RENAME CONSTRAINT "tip_bonuses_pkey" TO "rewards_pkey";
ALTER TABLE "rewards" ALTER COLUMN "bonus_progress_id" DROP NOT NULL;

-- RenameIndex
ALTER INDEX "tip_bonuses_bonus_progress_id_key" RENAME TO "rewards_bonus_progress_id_key";

-- RenameIndex
ALTER INDEX "tip_bonuses_created_at_idx" RENAME TO "rewards_created_at_idx";

-- RenameIndex
ALTER INDEX "tip_bonuses_user_id_idx" RENAME TO "rewards_user_id_idx";

-- This is an empty migration.
INSERT INTO public.permissions ("name","is_editable") VALUES
('read_rewards', true),
('create_rewards', true);

DO
$$
DECLARE
super_master_id  INT;
marketing_id INT;
accounting_id INT;
BEGIN
  select id into super_master_id from roles where name = 'SUPER_MASTER';
  select id into marketing_id from roles where name = 'MARKETING';
  select id into accounting_id from roles where name = 'ACCOUNTANT';

  INSERT INTO public.role_permissions ("role_id","permission_id") VALUES
  (super_master_id,(select id from permissions where name = 'read_rewards')),
  (marketing_id,(select id from permissions where name = 'read_rewards')),
  (accounting_id,(select id from permissions where name = 'read_rewards')),
  (super_master_id,(select id from permissions where name = 'create_rewards')),
  (marketing_id,(select id from permissions where name = 'create_rewards')),
  (accounting_id,(select id from permissions where name = 'create_rewards'));

  END;
$$
LANGUAGE plpgsql;-- This is an empty migration.