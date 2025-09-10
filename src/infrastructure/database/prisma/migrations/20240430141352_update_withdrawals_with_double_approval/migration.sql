-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "first_approval_at" TIMESTAMP(3),
ADD COLUMN     "first_approver_id" TEXT,
ADD COLUMN     "second_approval_at" TIMESTAMP(3),
ADD COLUMN     "second_approver_id" TEXT;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_first_approver_id_fkey" FOREIGN KEY ("first_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_second_approver_id_fkey" FOREIGN KEY ("second_approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
