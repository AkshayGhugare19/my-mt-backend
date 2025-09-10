-- CreateTable
CREATE TABLE "slotegrator_sportsbook_bets" (
    "id" TEXT NOT NULL,
    "bet_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "settlement_transaction_id" TEXT[],
    "refund_transaction_id" TEXT[],
    "sesison_id" TEXT,
    "game_id" TEXT NOT NULL,
    "rollback_transaction_id" TEXT[],
    "processed_transaction_id" TEXT[],

    CONSTRAINT "slotegrator_sportsbook_bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slotegrator_sportsbook_bets_transaction_id_idx" ON "slotegrator_sportsbook_bets"("transaction_id");

-- AddForeignKey
ALTER TABLE "slotegrator_sportsbook_bets" ADD CONSTRAINT "slotegrator_sportsbook_bets_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
