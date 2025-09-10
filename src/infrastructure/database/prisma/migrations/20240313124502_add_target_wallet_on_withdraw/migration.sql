/*
  Warnings:

  - Added the required column `target_wallet` to the `withdrawal_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "target_wallet" TEXT NOT NULL;
