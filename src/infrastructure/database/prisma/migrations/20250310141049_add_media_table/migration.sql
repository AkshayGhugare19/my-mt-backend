/*
  Warnings:

  - A unique constraint covering the columns `[id,media_type]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "media_type" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_entity_id_entity_type_idx" ON "media"("entity_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_media_type_key" ON "users"("id", "media_type");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_entity_id_entity_type_fkey" FOREIGN KEY ("entity_id", "entity_type") REFERENCES "users"("id", "media_type") ON DELETE RESTRICT ON UPDATE CASCADE;
