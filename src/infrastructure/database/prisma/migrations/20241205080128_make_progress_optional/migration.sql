-- DropForeignKey
ALTER TABLE "coupon_code_redeems" DROP CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey";

-- AlterTable
ALTER TABLE "coupon_code_redeems" ALTER COLUMN "bonus_progress_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
