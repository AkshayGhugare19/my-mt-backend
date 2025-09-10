/*
  Warnings:

  - You are about to drop the column `multiplier` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token_issue_requests" ALTER COLUMN "prepaid" SET DEFAULT 'postpaid',
ALTER COLUMN "prepaid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "multiplier",
ADD COLUMN     "flexibleBookieStake" DECIMAL(65,30),
ADD COLUMN     "predefinedBookieStake" DECIMAL(65,30),
ADD COLUMN     "userBookieStake" DECIMAL(65,30);
