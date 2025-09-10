/*
  Warnings:

  - You are about to drop the column `event_id` on the `FungamessBet` table. All the data in the column will be lost.
  - Added the required column `transaction_id` to the `FungamessBet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FungamessBet_event_id_idx";

-- AlterTable
ALTER TABLE "FungamessBet" DROP COLUMN "event_id",
ADD COLUMN     "transaction_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FungamessBet_transaction_id_idx" ON "FungamessBet"("transaction_id");
