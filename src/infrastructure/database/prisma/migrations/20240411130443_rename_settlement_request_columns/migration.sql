/*
  Warnings:

  - You are about to drop the column `vip_id` on the `token_settlement_requests` table. All the data in the column will be lost.
  - Added the required column `target_id` to the `token_settlement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "token_settlement_requests" DROP CONSTRAINT "token_settlement_requests_vip_id_fkey";

-- DropIndex
DROP INDEX "token_settlement_requests_vip_id_idx";

-- AlterTable
ALTER TABLE "token_settlement_requests" DROP COLUMN "vip_id",
ADD COLUMN     "target_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "token_settlement_requests_target_id_idx" ON "token_settlement_requests"("target_id");

-- AddForeignKey
ALTER TABLE "token_settlement_requests" ADD CONSTRAINT "token_settlement_requests_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
