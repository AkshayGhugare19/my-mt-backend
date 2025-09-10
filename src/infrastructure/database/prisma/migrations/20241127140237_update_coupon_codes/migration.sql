/*
  Warnings:

  - You are about to drop the column `amount` on the `coupon_codes` table. All the data in the column will be lost.
  - Added the required column `bonus_progress_id` to the `coupon_code_redeems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `current_rollover` to the `coupon_code_redeems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rollover_target` to the `coupon_code_redeems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bonus_id` to the `coupon_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `config` to the `coupon_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "coupon_code_redeems" ADD COLUMN     "bonus_balance_id" INTEGER,
ADD COLUMN     "bonus_progress_id" INTEGER NOT NULL,
ADD COLUMN     "consumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_rollover" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "rollover_target" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "coupon_codes" DROP COLUMN "amount",
ADD COLUMN     "bonus_id" TEXT NOT NULL,
ADD COLUMN     "config" JSONB NOT NULL;

-- CreateIndex
CREATE INDEX "coupon_code_redeems_bonus_balance_id_idx" ON "coupon_code_redeems"("bonus_balance_id");

-- CreateIndex
CREATE INDEX "coupon_code_redeems_bonus_progress_id_idx" ON "coupon_code_redeems"("bonus_progress_id");

-- CreateIndex
CREATE INDEX "coupon_codes_bonus_id_idx" ON "coupon_codes"("bonus_id");

-- AddForeignKey
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_bonus_balance_id_fkey" FOREIGN KEY ("bonus_balance_id") REFERENCES "user_bonus_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
