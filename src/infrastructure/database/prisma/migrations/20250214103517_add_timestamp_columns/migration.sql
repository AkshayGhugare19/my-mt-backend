-- DropIndex
DROP INDEX "deposit_wallets_wallet_idx";

-- AlterTable
ALTER TABLE "deposit_wallets" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
