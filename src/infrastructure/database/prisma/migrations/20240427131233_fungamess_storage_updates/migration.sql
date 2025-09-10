/*
  Warnings:

  - The primary key for the `fungamess_games` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `game_id` on the `fungamess_games` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "fungamess_games" DROP CONSTRAINT "fungamess_games_pkey",
ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "game_id",
ADD COLUMN     "game_id" INTEGER NOT NULL,
ALTER COLUMN "category_icon" DROP NOT NULL,
ADD CONSTRAINT "fungamess_games_pkey" PRIMARY KEY ("game_id");

-- CreateTable
CREATE TABLE "fungamess_providers" (
    "provider_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "category" INTEGER NOT NULL,

    CONSTRAINT "fungamess_providers_pkey" PRIMARY KEY ("provider_id")
);

-- AddForeignKey
ALTER TABLE "fungamess_games" ADD CONSTRAINT "fungamess_games_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "fungamess_providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;
