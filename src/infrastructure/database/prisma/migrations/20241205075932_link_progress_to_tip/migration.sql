/*
  Warnings:

  - A unique constraint covering the columns `[bonus_progress_id]` on the table `coupon_code_redeems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bonus_progress_id]` on the table `tip_bonuses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bonus_progress_id` to the `coupon_code_redeems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bonus_progress_id` to the `tip_bonuses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupon_code_redeems" ADD COLUMN     "bonus_progress_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tip_bonuses" ADD COLUMN     "bonus_progress_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_redeems_bonus_progress_id_key" ON "coupon_code_redeems"("bonus_progress_id");

-- CreateIndex
CREATE UNIQUE INDEX "tip_bonuses_bonus_progress_id_key" ON "tip_bonuses"("bonus_progress_id");

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
