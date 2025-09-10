/*
  Warnings:

  - You are about to drop the column `superMasterStatus` on the `token_settlement_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token_settlement_requests" DROP COLUMN "superMasterStatus",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
