-- CreateTable
CREATE TABLE "SlotegratorGame" (
    "game_id" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "has_lobby" BOOLEAN NOT NULL,
    "is_mobile_full_window" BOOLEAN NOT NULL,
    "has_free_spins" BOOLEAN NOT NULL,
    "has_tables" BOOLEAN NOT NULL,

    CONSTRAINT "SlotegratorGame_pkey" PRIMARY KEY ("game_id")
);
