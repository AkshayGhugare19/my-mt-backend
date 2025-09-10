/*
  Warnings:

  - Made the column `slug` on table `SlotegratorGame` required. This step will fail if there are existing NULL values in that column.

*/
DO $$
DECLARE
    game_cursor CURSOR FOR 
        SELECT game_id, provider, name FROM "SlotegratorGame";
    game_record RECORD;
    slug_value TEXT;
BEGIN
    -- AlterTable
    ALTER TABLE "SlotegratorGame" ADD COLUMN     "old_slug" VARCHAR(150),
    ALTER COLUMN "slug" SET NOT NULL;

    -- CreateIndex
    CREATE INDEX "SlotegratorGame_old_slug_idx" ON "SlotegratorGame"("old_slug");

    OPEN game_cursor;
    
    LOOP
        FETCH game_cursor INTO game_record;
        EXIT WHEN NOT FOUND;

        -- Update the record
        UPDATE "SlotegratorGame" 
        SET old_slug = game_id
        WHERE game_id = game_record.game_id;
    END LOOP;
    
    CLOSE game_cursor;
END $$;