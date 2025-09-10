-- AlterTable
ALTER TABLE "deposit_transactions" ADD COLUMN     "currency" SMALLINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "currency" SMALLINT NOT NULL DEFAULT 0;
