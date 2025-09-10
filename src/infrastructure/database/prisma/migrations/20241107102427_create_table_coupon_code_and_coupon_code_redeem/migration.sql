-- CreateTable
CREATE TABLE "coupon_codes" (
    "id" SERIAL NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" SMALLINT NOT NULL,
    "amount" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_code_redeems" (
    "id" SERIAL NOT NULL,
    "coupon_code_id" INTEGER NOT NULL,
    "redeemer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_code_redeems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_codes_code_key" ON "coupon_codes"("code");

-- CreateIndex
CREATE INDEX "coupon_codes_created_by_id_idx" ON "coupon_codes"("created_by_id");

-- CreateIndex
CREATE INDEX "coupon_code_redeems_coupon_code_id_idx" ON "coupon_code_redeems"("coupon_code_id");

-- CreateIndex
CREATE INDEX "coupon_code_redeems_redeemer_id_idx" ON "coupon_code_redeems"("redeemer_id");

-- CreateIndex
CREATE INDEX "coupon_code_redeems_created_at_idx" ON "coupon_code_redeems"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_redeems_coupon_code_id_redeemer_id_key" ON "coupon_code_redeems"("coupon_code_id", "redeemer_id");

-- AddForeignKey
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_coupon_code_id_fkey" FOREIGN KEY ("coupon_code_id") REFERENCES "coupon_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_code_redeems" ADD CONSTRAINT "coupon_code_redeems_redeemer_id_fkey" FOREIGN KEY ("redeemer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
