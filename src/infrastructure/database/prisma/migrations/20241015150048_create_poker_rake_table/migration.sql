-- CreateTable
CREATE TABLE "poker_rakes" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "poker_player_id" TEXT NOT NULL,
    "rake" DECIMAL(65,30) NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poker_rakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poker_rakes_user_id_upload_date_key" ON "poker_rakes"("user_id", "upload_date");

-- AddForeignKey
ALTER TABLE "poker_rakes" ADD CONSTRAINT "poker_rakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
