/*
  Warnings:

  - The primary key for the `fungamess_games` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "fungamess_games" DROP CONSTRAINT "fungamess_games_pkey",
ALTER COLUMN "game_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "fungamess_games_pkey" PRIMARY KEY ("game_id");
