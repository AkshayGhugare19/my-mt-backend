/*
  Warnings:

  - A unique constraint covering the columns `[credit_transaction_id]` on the table `bets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "bet_credit_transactions" (
    "bet_credit_transaction_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "bet_credit_transactions_bet_credit_transaction_id_transacti_key" ON "bet_credit_transactions"("bet_credit_transaction_id", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "bets_credit_transaction_id_key" ON "bets"("credit_transaction_id");

-- AddForeignKey
ALTER TABLE "bet_credit_transactions" ADD CONSTRAINT "bet_credit_transactions_bet_credit_transaction_id_fkey" FOREIGN KEY ("bet_credit_transaction_id") REFERENCES "bets"("credit_transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_credit_transactions" ADD CONSTRAINT "bet_credit_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
