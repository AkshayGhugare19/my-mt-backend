-- CreateTable
CREATE TABLE "poker_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "use_limit" INTEGER NOT NULL,
    "reuse_limit" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "range_from" DECIMAL(65,30) NOT NULL,
    "range_to" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_high_roller" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "poker_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poker_code_distributions" (
    "id" SERIAL NOT NULL,
    "distribution_count" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "code_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poker_code_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poker_codes_code_key" ON "poker_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "poker_code_distributions_user_id_code_id_key" ON "poker_code_distributions"("user_id", "code_id");

-- AddForeignKey
ALTER TABLE "poker_codes" ADD CONSTRAINT "poker_codes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poker_code_distributions" ADD CONSTRAINT "poker_code_distributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poker_code_distributions" ADD CONSTRAINT "poker_code_distributions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "poker_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
