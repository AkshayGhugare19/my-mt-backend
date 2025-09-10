/*
  Warnings:

  - A unique constraint covering the columns `[third_party_identifier,provider]` on the table `bets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "bets_user_id_idx" ON "bets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bets_third_party_identifier_provider_key" ON "bets"("third_party_identifier", "provider");

-- CreateIndex
CREATE INDEX "transactions_ledger_user_id_idx" ON "transactions_ledger"("user_id");

-- CreateIndex
CREATE INDEX "users_master_id_idx" ON "users"("master_id");
