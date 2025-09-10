-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "master_id" TEXT,
    "email" TEXT,
    "password" TEXT,
    "wallet" TEXT,
    "player_tag" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "blocked_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_key" ON "users"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "users_player_tag_key" ON "users"("player_tag");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
