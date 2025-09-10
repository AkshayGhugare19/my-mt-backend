-- CreateTable
CREATE TABLE "tip_bonuses" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_rollover" DECIMAL(65,30) NOT NULL,
    "rollover_target" DECIMAL(65,30) NOT NULL,
    "bonus_balance_id" INTEGER,
    "bonus_progress_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tip_bonuses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_bonus_balance_id_fkey" FOREIGN KEY ("bonus_balance_id") REFERENCES "user_bonus_balances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tip_bonuses" ADD CONSTRAINT "tip_bonuses_bonus_progress_id_fkey" FOREIGN KEY ("bonus_progress_id") REFERENCES "user_bonus_progressions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
