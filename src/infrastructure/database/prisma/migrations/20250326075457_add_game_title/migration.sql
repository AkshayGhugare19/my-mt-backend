
DO $$
DECLARE
    game_cursor CURSOR FOR 
        SELECT game_id, provider, name FROM "SlotegratorGame";
    game_record RECORD;
    provider_slug TEXT;
    formed_title TEXT;
BEGIN
    -- AlterTable
    ALTER TABLE "SlotegratorGame" ADD COLUMN     "title" VARCHAR(100);

    OPEN game_cursor;
    
    LOOP
        FETCH game_cursor INTO game_record;
        EXIT WHEN NOT FOUND;

        -- I need you to split these camel case strings into words
        provider_slug := REGEXP_REPLACE(game_record.provider, '([a-z])([A-Z])', '\1 \2', 'g');

        -- Combine to create the title
        formed_title := game_record.name || ' by ' || provider_slug;

        -- Update the record
        UPDATE "SlotegratorGame" 
        SET title = formed_title
        WHERE game_id = game_record.game_id;
    END LOOP;
    
    CLOSE game_cursor;
END $$;