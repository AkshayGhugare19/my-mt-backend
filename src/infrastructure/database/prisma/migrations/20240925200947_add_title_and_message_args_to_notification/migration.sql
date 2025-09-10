/*
  Warnings:

  - You are about to drop the column `message` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `code` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "message",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "message_args" JSONB,
ADD COLUMN     "title_args" JSONB;
