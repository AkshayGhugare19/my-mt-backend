/*
  Warnings:

  - Added the required column `type` to the `token_settlement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "token_settlement_requests" ADD COLUMN     "proof" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;
