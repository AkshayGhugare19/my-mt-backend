/*
  Warnings:

  - The `settlement_transaction_id` column on the `slotegrator_game_bets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `refund_transaction_id` column on the `slotegrator_game_bets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rollback_transaction_id` column on the `slotegrator_game_bets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "slotegrator_game_bets" DROP COLUMN "settlement_transaction_id",
ADD COLUMN     "settlement_transaction_id" TEXT[],
DROP COLUMN "refund_transaction_id",
ADD COLUMN     "refund_transaction_id" TEXT[],
DROP COLUMN "rollback_transaction_id",
ADD COLUMN     "rollback_transaction_id" TEXT[];
