/*
  Warnings:

  - You are about to drop the `FungamessBet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FungamessBet" DROP CONSTRAINT "FungamessBet_bet_id_fkey";

-- DropTable
DROP TABLE "FungamessBet";

-- CreateTable
CREATE TABLE "fungamess_bets" (
    "bet_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,

    CONSTRAINT "fungamess_bets_pkey" PRIMARY KEY ("bet_id")
);

-- CreateTable
CREATE TABLE "token_issue_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "master_id" TEXT NOT NULL,
    "initiator" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_issue_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fungamess_bets_transaction_id_idx" ON "fungamess_bets"("transaction_id");

-- CreateIndex
CREATE INDEX "fungamess_bets_game_id_idx" ON "fungamess_bets"("game_id");

-- AddForeignKey
ALTER TABLE "fungamess_bets" ADD CONSTRAINT "fungamess_bets_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_issue_requests" ADD CONSTRAINT "token_issue_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_issue_requests" ADD CONSTRAINT "token_issue_requests_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
