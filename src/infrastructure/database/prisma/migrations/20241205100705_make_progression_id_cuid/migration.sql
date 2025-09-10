/*
  Warnings:

  - The primary key for the `user_bonus_progressions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "coupon_code_redeems" DROP CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey";

-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_bonus_progress_id_fkey";

-- AlterTable
ALTER TABLE "coupon_code_redeems" ALTER COLUMN "bonus_progress_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tip_bonuses" ALTER COLUMN "bonus_progress_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_bonus_progressions" DROP CONSTRAINT "user_bonus_progressions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_bonus_progressions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "user_bonus_progressions_id_seq";

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
