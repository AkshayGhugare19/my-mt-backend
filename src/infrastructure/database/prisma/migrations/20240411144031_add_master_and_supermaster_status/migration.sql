-- AlterTable
ALTER TABLE "token_settlement_requests" ADD COLUMN     "master_approved_at" TIMESTAMP(3),
ADD COLUMN     "super_master_approved_at" TIMESTAMP(3);
