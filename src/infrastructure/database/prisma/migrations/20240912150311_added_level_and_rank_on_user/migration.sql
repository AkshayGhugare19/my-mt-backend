-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rank" TEXT NOT NULL DEFAULT 'Rank Bronze';
