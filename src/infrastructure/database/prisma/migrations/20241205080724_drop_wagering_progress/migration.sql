/*
  Warnings:

  - You are about to drop the `wagering_progresses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "wagering_progresses" DROP CONSTRAINT "wagering_progresses_user_id_fkey";

-- DropTable
DROP TABLE "wagering_progresses";
