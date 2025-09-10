-- CreateTable
CREATE TABLE "FungamessBet" (
    "bet_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,

    CONSTRAINT "FungamessBet_pkey" PRIMARY KEY ("bet_id")
);

-- CreateIndex
CREATE INDEX "FungamessBet_event_id_idx" ON "FungamessBet"("event_id");

-- CreateIndex
CREATE INDEX "FungamessBet_game_id_idx" ON "FungamessBet"("game_id");

-- AddForeignKey
ALTER TABLE "FungamessBet" ADD CONSTRAINT "FungamessBet_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
