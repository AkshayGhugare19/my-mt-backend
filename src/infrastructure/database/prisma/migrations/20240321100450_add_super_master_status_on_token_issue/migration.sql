/*
  Warnings:

  - You are about to drop the column `status` on the `token_issue_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token_issue_requests" DROP COLUMN "status",
ADD COLUMN     "masterStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "superMasterStatus" TEXT NOT NULL DEFAULT 'PENDING';
