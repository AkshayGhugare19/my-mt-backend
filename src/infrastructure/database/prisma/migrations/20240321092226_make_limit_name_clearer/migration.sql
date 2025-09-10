/*
  Warnings:

  - You are about to drop the column `max_exposure` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "max_exposure",
ADD COLUMN     "max_masters_exposure" DECIMAL(65,30);
