-- CreateTable
CREATE TABLE "web3auth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "curve" VARCHAR(10),
    "email" VARCHAR(80),
    "blockchain" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web3auth_accounts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "web3auth_accounts" ADD CONSTRAINT "web3auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
