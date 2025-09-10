-- CreateTable
CREATE TABLE "balances" (
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_deposit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_withdraw" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_win" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_loss" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "volume_played" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "biggest_win" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "biggest_loss" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "balances_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "balances"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
