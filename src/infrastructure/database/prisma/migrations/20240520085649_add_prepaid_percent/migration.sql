/*
  Warnings:

  - You are about to drop the column `prepaid` on the `token_issue_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token_issue_requests" DROP COLUMN "prepaid",
ADD COLUMN     "prepaid_percent" DOUBLE PRECISION;
