-- AlterTable
ALTER TABLE "users" ADD COLUMN     "partner_matrix_btag" TEXT,
ALTER COLUMN "pm_id" DROP NOT NULL;
