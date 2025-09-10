/*
  Warnings:

  - You are about to drop the column `masterStatus` on the `token_issue_requests` table. All the data in the column will be lost.
  - You are about to drop the column `superMasterStatus` on the `token_issue_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token_issue_requests" 
RENAME COLUMN "masterStatus" TO "status";

ALTER TABLE "token_issue_requests" 
DROP COLUMN "superMasterStatus";
