-- AlterTable
ALTER TABLE "token_issue_requests" ADD COLUMN     "payment_type" TEXT,
ADD COLUMN     "prepaid" BOOLEAN,
ADD COLUMN     "proof" TEXT;
