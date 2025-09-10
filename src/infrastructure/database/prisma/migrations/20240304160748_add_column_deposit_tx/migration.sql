/*
  Warnings:

  - Added the required column `blockNumber` to the `deposit_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blockTimestam` to the `deposit_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "deposit_transactions" ADD COLUMN     "blockNumber" INTEGER NOT NULL,
ADD COLUMN     "blockTimestam" INTEGER NOT NULL;
