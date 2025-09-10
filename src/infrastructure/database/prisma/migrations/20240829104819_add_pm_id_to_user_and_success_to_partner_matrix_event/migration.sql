/*
  Warnings:

  - Added the required column `success` to the `partner_matrix_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "partner_matrix_events" ADD COLUMN     "success" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pm_id" SERIAL;
