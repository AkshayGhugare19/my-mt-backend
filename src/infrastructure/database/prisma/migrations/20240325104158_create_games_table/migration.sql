-- CreateTable
CREATE TABLE "fungamess_games" (
    "game_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basic_rtp" DECIMAL(65,30) NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "bonus_buy" BOOLEAN NOT NULL,
    "img" TEXT NOT NULL,
    "img_vertical" TEXT NOT NULL,
    "img_provider" TEXT NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "device" TEXT NOT NULL,
    "category_icon" TEXT NOT NULL,

    CONSTRAINT "fungamess_games_pkey" PRIMARY KEY ("game_id")
);
