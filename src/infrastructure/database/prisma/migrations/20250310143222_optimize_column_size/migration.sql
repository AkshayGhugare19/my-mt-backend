/*
  Warnings:

  - You are about to alter the column `entity_id` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(40)`.
  - You are about to alter the column `entity_type` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `type` on the `media` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.

*/
-- DropForeignKey
ALTER TABLE "media" DROP CONSTRAINT "media_entity_id_entity_type_fkey";

-- AlterTable
ALTER TABLE "media" ALTER COLUMN "entity_id" SET DATA TYPE VARCHAR(40),
ALTER COLUMN "entity_type" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(30);

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_entity_id_entity_type_fkey" FOREIGN KEY ("entity_id", "entity_type") REFERENCES "users"("id", "media_type") ON DELETE RESTRICT ON UPDATE CASCADE;
