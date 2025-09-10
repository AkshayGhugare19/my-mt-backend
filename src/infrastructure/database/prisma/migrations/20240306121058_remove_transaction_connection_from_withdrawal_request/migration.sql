/*
  Warnings:

  - You are about to drop the column `transaction_id` on the `withdrawal_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "withdrawal_requests" DROP CONSTRAINT "withdrawal_requests_transaction_id_fkey";

-- AlterTable
ALTER TABLE "withdrawal_requests" DROP COLUMN "transaction_id",
ADD COLUMN     "transaction_hash" TEXT;
