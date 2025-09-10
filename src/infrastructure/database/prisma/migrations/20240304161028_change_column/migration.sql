/*
  Warnings:

  - You are about to drop the column `blockTimestam` on the `deposit_transactions` table. All the data in the column will be lost.
  - Added the required column `blockTimestamp` to the `deposit_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "deposit_transactions" DROP COLUMN "blockTimestam",
ADD COLUMN     "blockTimestamp" INTEGER NOT NULL;
