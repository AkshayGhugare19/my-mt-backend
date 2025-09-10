-- AlterTable
ALTER TABLE "SlotegratorGame" ADD COLUMN     "game_category_id" TEXT;

-- CreateTable
CREATE TABLE "game_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "game_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_category_name_key" ON "game_category"("name");

-- AddForeignKey
ALTER TABLE "SlotegratorGame" ADD CONSTRAINT "SlotegratorGame_game_category_id_fkey" FOREIGN KEY ("game_category_id") REFERENCES "game_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
