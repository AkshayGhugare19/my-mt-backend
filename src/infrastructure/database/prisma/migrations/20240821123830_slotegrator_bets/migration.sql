-- CreateTable
CREATE TABLE "slotegrator_game_bets" (
    "id" TEXT NOT NULL,
    "bet_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "sesison_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "round_finished" BOOLEAN NOT NULL DEFAULT true,
    "game_id" TEXT NOT NULL,

    CONSTRAINT "slotegrator_game_bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slotegrator_game_bets_transaction_id_idx" ON "slotegrator_game_bets"("transaction_id");

-- CreateIndex
CREATE INDEX "slotegrator_game_bets_game_id_idx" ON "slotegrator_game_bets"("game_id");

-- AddForeignKey
ALTER TABLE "slotegrator_game_bets" ADD CONSTRAINT "slotegrator_game_bets_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "SlotegratorGame"("game_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slotegrator_game_bets" ADD CONSTRAINT "slotegrator_game_bets_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
