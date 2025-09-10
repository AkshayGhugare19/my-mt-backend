-- CreateIndex
CREATE INDEX "token_settlement_requests_created_at_idx" ON "token_settlement_requests"("created_at");

-- CreateIndex
CREATE INDEX "token_settlement_requests_vip_id_idx" ON "token_settlement_requests"("vip_id");

-- CreateIndex
CREATE INDEX "token_settlement_requests_master_id_idx" ON "token_settlement_requests"("master_id");
