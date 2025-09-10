-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "third_party_identifier" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "debit_transaction_id" TEXT NOT NULL,
    "credit_transaction_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "bet_amount" DECIMAL(65,30) NOT NULL,
    "settlement_amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
