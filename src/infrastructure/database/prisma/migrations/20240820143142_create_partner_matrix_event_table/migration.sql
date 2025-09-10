-- CreateTable
CREATE TABLE "partner_matrix_events" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_matrix_events_pkey" PRIMARY KEY ("id")
);
