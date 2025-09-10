-- CreateIndex
CREATE INDEX "tip_bonuses_created_at_idx" ON "tip_bonuses"("created_at");

-- CreateIndex
CREATE INDEX "tip_bonuses_bonus_balance_id_idx" ON "tip_bonuses"("bonus_balance_id");

-- CreateIndex
CREATE INDEX "tip_bonuses_user_id_idx" ON "tip_bonuses"("user_id");
