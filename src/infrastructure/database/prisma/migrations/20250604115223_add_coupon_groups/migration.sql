-- CreateTable
CREATE TABLE "CouponGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponCodeOnGroup" (
    "coupon_code_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "CouponCodeOnGroup_pkey" PRIMARY KEY ("coupon_code_id","group_id")
);

-- AddForeignKey
ALTER TABLE "CouponCodeOnGroup" ADD CONSTRAINT "CouponCodeOnGroup_coupon_code_id_fkey" FOREIGN KEY ("coupon_code_id") REFERENCES "coupon_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponCodeOnGroup" ADD CONSTRAINT "CouponCodeOnGroup_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "CouponGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
