/*
  Warnings:

  - A unique constraint covering the columns `[bonus_balance_id]` on the table `user_bonus_progressions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bonuses" ADD COLUMN     "withdraw_after_rollover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_bonus_progressions" ADD COLUMN     "bonus_balance_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "user_bonus_progressions_bonus_balance_id_key" ON "user_bonus_progressions"("bonus_balance_id");

-- AddForeignKey
ALTER TABLE "user_bonus_progressions" ADD CONSTRAINT "user_bonus_progressions_bonus_balance_id_fkey" FOREIGN KEY ("bonus_balance_id") REFERENCES "user_bonus_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
