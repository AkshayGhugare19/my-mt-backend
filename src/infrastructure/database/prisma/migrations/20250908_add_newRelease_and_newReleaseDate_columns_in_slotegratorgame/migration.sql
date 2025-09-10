-- AlterTable
ALTER TABLE "SlotegratorGame"
    ADD COLUMN IF NOT EXISTS "new_release_date" TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "new_release" BOOLEAN NOT NULL DEFAULT false;