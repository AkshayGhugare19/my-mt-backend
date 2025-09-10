-- CreateTable
CREATE TABLE "deposit_wallets" (
    "user_id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "blockchain" SMALLINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "deposit_wallets_wallet_key" ON "deposit_wallets"("wallet");

-- CreateIndex
CREATE INDEX "deposit_wallets_user_id_idx" ON "deposit_wallets"("user_id");

-- CreateIndex
CREATE INDEX "deposit_wallets_wallet_idx" ON "deposit_wallets"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_wallets_user_id_wallet_key" ON "deposit_wallets"("user_id", "wallet");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_wallets_wallet_blockchain_key" ON "deposit_wallets"("wallet", "blockchain");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_wallets_user_id_is_active_key" ON "deposit_wallets"("user_id") 
WHERE "is_active" = true;

-- AddForeignKey
ALTER TABLE "deposit_wallets" ADD CONSTRAINT "deposit_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
