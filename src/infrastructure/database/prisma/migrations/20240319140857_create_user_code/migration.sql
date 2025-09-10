-- CreateTable
CREATE TABLE "user_codes" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "code" TEXT NOT NULL,
    "code_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_codes_user_id_code_type_key" ON "user_codes"("user_id", "code_type");

-- AddForeignKey
ALTER TABLE "user_codes" ADD CONSTRAINT "user_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
