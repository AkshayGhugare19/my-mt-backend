-- AlterTable
ALTER TABLE "balances" ADD COLUMN     "total_settled" DECIMAL(65,30) NOT NULL DEFAULT 0;
