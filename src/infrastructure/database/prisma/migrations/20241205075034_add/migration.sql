/*
  Warnings:

  - You are about to drop the column `type` on the `coupon_code_redeems` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `tip_bonuses` table. All the data in the column will be lost.
  - You are about to drop the column `override_entity_id` on the `user_bonus_progressions` table. All the data in the column will be lost.
  - You are about to drop the column `override_type` on the `user_bonus_progressions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_bonus_progressions" DROP CONSTRAINT "coupon_code_wagering_progress";

-- DropForeignKey
ALTER TABLE "user_bonus_progressions" DROP CONSTRAINT "tip_bonus_wagering_progress";

-- DropIndex
DROP INDEX "coupon_code_redeems_id_type_key";

-- DropIndex
DROP INDEX "tip_bonuses_id_type_key";

-- DropIndex
DROP INDEX "user_bonus_progressions_override_entity_id_override_type_key";

-- AlterTable
ALTER TABLE "coupon_code_redeems" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "tip_bonuses" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "user_bonus_progressions" DROP COLUMN "override_entity_id",
DROP COLUMN "override_type",
ADD COLUMN     "config_override" JSONB;
