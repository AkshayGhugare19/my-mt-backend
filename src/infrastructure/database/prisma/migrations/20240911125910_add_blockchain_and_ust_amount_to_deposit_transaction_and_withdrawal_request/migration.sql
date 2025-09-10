-- AlterTable
ALTER TABLE "deposit_transactions" ADD COLUMN     "blockchain" SMALLINT,
ADD COLUMN     "usd_amount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "blockchain" SMALLINT,
ADD COLUMN     "usd_amount" DECIMAL(65,30);
