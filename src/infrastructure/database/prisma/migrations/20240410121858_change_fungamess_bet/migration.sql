/*
  Warnings:

  - The primary key for the `fungamess_bets` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "fungamess_bets" DROP CONSTRAINT "fungamess_bets_pkey",
ADD CONSTRAINT "fungamess_bets_pkey" PRIMARY KEY ("bet_id", "transaction_id");
