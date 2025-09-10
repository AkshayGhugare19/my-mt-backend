-- CreateTable
CREATE TABLE "token_settlement_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "master_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "superMasterStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_settlement_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "token_settlement_requests" ADD CONSTRAINT "token_settlement_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_settlement_requests" ADD CONSTRAINT "token_settlement_requests_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
