-- CreateTable
CREATE TABLE "transactions_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "counter_party" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_ledger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions_ledger" ADD CONSTRAINT "transactions_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
