/*
  Warnings:

  - You are about to drop the column `bonus_balance_id` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `bonus_progress_id` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `current_rollover` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `rollover_target` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `bonus_balance_id` on the `tip_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `bonus_progress_id` on the `tip_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `current_rollover` on the `tip_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `rollover_target` on the `tip_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `tip_bonuses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id,type]` on the table `coupon_code_redeems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,type]` on the table `tip_bonuses` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "coupon_code_redeems" DROP CONSTRAINT "coupon_code_redeems_bonus_balance_id_fkey";

-- DropForeignKey
ALTER TABLE "coupon_code_redeems" DROP CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey";

-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_bonus_balance_id_fkey";

-- DropForeignKey
ALTER TABLE "tip_bonuses" DROP CONSTRAINT "tip_bonuses_bonus_progress_id_fkey";

-- DropIndex
DROP INDEX "coupon_code_redeems_bonus_balance_id_idx";

-- DropIndex
DROP INDEX "coupon_code_redeems_bonus_progress_id_idx";

-- DropIndex
DROP INDEX "tip_bonuses_bonus_balance_id_idx";

-- AlterTable
ALTER TABLE "coupon_code_redeems" DROP COLUMN "bonus_balance_id",
DROP COLUMN "bonus_progress_id",
DROP COLUMN "current_rollover",
DROP COLUMN "rollover_target",
DROP COLUMN "status",
ADD COLUMN     "type" VARCHAR(6) NOT NULL DEFAULT 'coupon';

-- AlterTable
ALTER TABLE "tip_bonuses" DROP COLUMN "bonus_balance_id",
DROP COLUMN "bonus_progress_id",
DROP COLUMN "current_rollover",
DROP COLUMN "rollover_target",
DROP COLUMN "status",
ADD COLUMN     "type" VARCHAR(3) NOT NULL DEFAULT 'tip';

-- CreateTable
CREATE TABLE "wagering_progresses" (
    "id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_rollover" DECIMAL(65,30) NOT NULL,
    "rollover_target" DECIMAL(65,30) NOT NULL,
    "bonus_balance_id" INTEGER,
    "bonus_progress_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "wagering_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wagering_progresses_user_id_idx" ON "wagering_progresses"("user_id");

-- CreateIndex
CREATE INDEX "wagering_progresses_bonus_balance_id_idx" ON "wagering_progresses"("bonus_balance_id");

-- CreateIndex
CREATE INDEX "wagering_progresses_bonus_progress_id_idx" ON "wagering_progresses"("bonus_progress_id");

-- CreateIndex
CREATE UNIQUE INDEX "wagering_progresses_id_type_key" ON "wagering_progresses"("id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_redeems_id_type_key" ON "coupon_code_redeems"("id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tip_bonuses_id_type_key" ON "tip_bonuses"("id", "type");

-- AddForeignKey
ALTER TABLE "wagering_progresses" ADD CONSTRAINT "tip_bonus_wagering_progress" FOREIGN KEY ("id", "type") REFERENCES "tip_bonuses"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wagering_progresses" ADD CONSTRAINT "coupon_code_wagering_progress" FOREIGN KEY ("id", "type") REFERENCES "coupon_code_redeems"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wagering_progresses" ADD CONSTRAINT "wagering_progresses_bonus_balance_id_fkey" FOREIGN KEY ("bonus_balance_id") REFERENCES "user_bonus_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wagering_progresses" ADD CONSTRAINT "wagering_progresses_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wagering_progresses" ADD CONSTRAINT "wagering_progresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
