-- CreateIndex
CREATE INDEX "bets_created_at_idx" ON "bets"("created_at");

-- CreateIndex
CREATE INDEX "token_issue_requests_created_at_idx" ON "token_issue_requests"("created_at");

-- CreateIndex
CREATE INDEX "token_issue_requests_requester_id_idx" ON "token_issue_requests"("requester_id");

-- CreateIndex
CREATE INDEX "token_issue_requests_master_id_idx" ON "token_issue_requests"("master_id");

-- CreateIndex
CREATE INDEX "transactions_ledger_created_at_idx" ON "transactions_ledger"("created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "withdrawal_requests_created_at_idx" ON "withdrawal_requests"("created_at");

-- CreateIndex
CREATE INDEX "withdrawal_requests_user_id_idx" ON "withdrawal_requests"("user_id");
