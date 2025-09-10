-- CreateTable
CREATE TABLE "deposit_transactions" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "raw" JSON NOT NULL,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);
