/*
  Warnings:

  - A unique constraint covering the columns `[override_entity_id,override_type]` on the table `user_bonus_progressions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "user_bonus_progressions" DROP CONSTRAINT "coupon_code_wagering_progress";

-- DropForeignKey
ALTER TABLE "user_bonus_progressions" DROP CONSTRAINT "tip_bonus_wagering_progress";

-- DropIndex
DROP INDEX "user_bonus_progressions_id_override_type_key";

-- AlterTable
ALTER TABLE "user_bonus_progressions" ADD COLUMN     "override_entity_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "user_bonus_progressions_override_entity_id_override_type_key" ON "user_bonus_progressions"("override_entity_id", "override_type");

-- AddForeignKey
ALTER TABLE "user_bonus_progressions" ADD CONSTRAINT "tip_bonus_wagering_progress" FOREIGN KEY ("override_entity_id", "override_type") REFERENCES "tip_bonuses"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bonus_progressions" ADD CONSTRAINT "coupon_code_wagering_progress" FOREIGN KEY ("override_entity_id", "override_type") REFERENCES "coupon_code_redeems"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;
