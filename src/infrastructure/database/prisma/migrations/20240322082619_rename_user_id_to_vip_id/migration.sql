/*
  Warnings:

  - You are about to drop the column `requester_id` on the `token_settlement_requests` table. All the data in the column will be lost.
  - Added the required column `vip_id` to the `token_settlement_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "token_settlement_requests" DROP CONSTRAINT "token_settlement_requests_requester_id_fkey";

-- AlterTable
ALTER TABLE "token_settlement_requests" DROP COLUMN "requester_id",
ADD COLUMN     "vip_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "token_settlement_requests" ADD CONSTRAINT "token_settlement_requests_vip_id_fkey" FOREIGN KEY ("vip_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
