/*
  Warnings:

  - Added the required column `initiator` to the `token_settlement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "token_settlement_requests" ADD COLUMN     "initiator" TEXT NOT NULL;
