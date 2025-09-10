/*
  Warnings:

  - You are about to drop the `CouponCodeOnGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CouponGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CouponCodeOnGroup" DROP CONSTRAINT "CouponCodeOnGroup_coupon_code_id_fkey";

-- DropForeignKey
ALTER TABLE "CouponCodeOnGroup" DROP CONSTRAINT "CouponCodeOnGroup_group_id_fkey";

-- DropTable
DROP TABLE "CouponCodeOnGroup";

-- DropTable
DROP TABLE "CouponGroup";

-- CreateTable
CREATE TABLE "coupon_group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "coupon_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_code_on_group" (
    "coupon_code_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "coupon_code_on_group_pkey" PRIMARY KEY ("coupon_code_id","group_id")
);

-- AddForeignKey
ALTER TABLE "coupon_code_on_group" ADD CONSTRAINT "coupon_code_on_group_coupon_code_id_fkey" FOREIGN KEY ("coupon_code_id") REFERENCES "coupon_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_code_on_group" ADD CONSTRAINT "coupon_code_on_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "coupon_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
