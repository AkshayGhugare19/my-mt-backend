/*
  Warnings:

  - The primary key for the `fungamess_bets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `fungamess_bets` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "fungamess_bets" DROP CONSTRAINT "fungamess_bets_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "fungamess_bets_pkey" PRIMARY KEY ("id");
