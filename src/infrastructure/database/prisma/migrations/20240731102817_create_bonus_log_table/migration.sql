-- CreateTable
CREATE TABLE "bonus_event_logs" (
    "id" SERIAL NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_event_logs_pkey" PRIMARY KEY ("id")
);
