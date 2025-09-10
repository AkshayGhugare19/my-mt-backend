-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_bonus_progress_id_fkey";

-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_user_id_fkey";

-- RENAME TABLE
ALTER TABLE "tip_bonuses" RENAME TO "rewards";

-- AlterTable 
ALTER TABLE "rewards" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'tip';
ALTER TABLE "rewards" ADD COLUMN "description" VARCHAR(80);

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
