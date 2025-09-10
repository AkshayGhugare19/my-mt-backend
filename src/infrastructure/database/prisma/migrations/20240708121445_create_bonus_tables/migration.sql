-- CreateTable
CREATE TABLE "bonuses" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "reward_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "limit_per_user" INTEGER,
    "max_reward" DECIMAL(65,30),
    "reward_amount" DECIMAL(65,30) NOT NULL,
    "rollover_type" TEXT,
    "rollover_amount" DECIMAL(65,30),
    "bonus_expiry_time" INTEGER,
    "rollover_expiry_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_triggers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "config_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config_options" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bonus_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_trigger_producer_configs" (
    "id" TEXT NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "trigger_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonus_trigger_producer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_trigger_progress_configs" (
    "id" TEXT NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "trigger_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonus_trigger_progress_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bonus_trigger_consumer_configs" (
    "id" TEXT NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "trigger_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonus_trigger_consumer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bonus_progressions" (
    "id" SERIAL NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_progress" INTEGER NOT NULL,
    "current_progress" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward_amount" DECIMAL(65,30) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_bonus_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bonus_balances" (
    "id" SERIAL NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_bonus_balances_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions_ledger" ADD COLUMN     "target_balance" TEXT NOT NULL DEFAULT 'account_balance';

-- CreateIndex
CREATE INDEX "bonus_trigger_producer_configs_bonus_id_idx" ON "bonus_trigger_producer_configs"("bonus_id");

-- CreateIndex
CREATE INDEX "bonus_trigger_producer_configs_trigger_id_idx" ON "bonus_trigger_producer_configs"("trigger_id");

-- CreateIndex
CREATE INDEX "bonus_trigger_progress_configs_bonus_id_idx" ON "bonus_trigger_progress_configs"("bonus_id");

-- CreateIndex
CREATE INDEX "bonus_trigger_progress_configs_trigger_id_idx" ON "bonus_trigger_progress_configs"("trigger_id");

-- CreateIndex
CREATE INDEX "bonus_trigger_consumer_configs_bonus_id_idx" ON "bonus_trigger_consumer_configs"("bonus_id");

-- CreateIndex
CREATE INDEX "bonus_trigger_consumer_configs_trigger_id_idx" ON "bonus_trigger_consumer_configs"("trigger_id");

-- CreateIndex
CREATE INDEX "user_bonus_progressions_bonus_id_idx" ON "user_bonus_progressions"("bonus_id");

-- CreateIndex
CREATE INDEX "user_bonus_progressions_user_id_idx" ON "user_bonus_progressions"("user_id");

-- CreateIndex
CREATE INDEX "user_bonus_progressions_status_idx" ON "user_bonus_progressions"("status");

-- CreateIndex
CREATE INDEX "user_bonus_balances_bonus_id_idx" ON "user_bonus_balances"("bonus_id");

-- CreateIndex
CREATE INDEX "user_bonus_balances_user_id_idx" ON "user_bonus_balances"("user_id");

-- CreateIndex
CREATE INDEX "user_bonus_balances_expires_at_idx" ON "user_bonus_balances"("expires_at");

-- AddForeignKey
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_producer_configs" ADD CONSTRAINT "bonus_trigger_producer_configs_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "bonus_triggers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_producer_configs" ADD CONSTRAINT "bonus_trigger_producer_configs_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_progress_configs" ADD CONSTRAINT "bonus_trigger_progress_configs_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "bonus_triggers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_progress_configs" ADD CONSTRAINT "bonus_trigger_progress_configs_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_consumer_configs" ADD CONSTRAINT "bonus_trigger_consumer_configs_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "bonus_triggers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_trigger_consumer_configs" ADD CONSTRAINT "bonus_trigger_consumer_configs_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bonus_progressions" ADD CONSTRAINT "user_bonus_progressions_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bonus_progressions" ADD CONSTRAINT "user_bonus_progressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bonus_balances" ADD CONSTRAINT "user_bonus_balances_bonus_id_fkey" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bonus_balances" ADD CONSTRAINT "user_bonus_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
