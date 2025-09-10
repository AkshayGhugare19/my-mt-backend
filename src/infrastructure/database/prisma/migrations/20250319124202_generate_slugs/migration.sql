-- CreateSlugsMigration
DO $$
DECLARE
    game_cursor CURSOR FOR 
        SELECT game_id, provider, name FROM "SlotegratorGame";
    game_record RECORD;
    slug_value TEXT;
    provider_slug TEXT;
    name_slug TEXT;
BEGIN
    -- AlterTable
    ALTER TABLE "SlotegratorGame" ADD COLUMN     "slug" VARCHAR(150);

    -- CreateIndex
    CREATE INDEX "SlotegratorGame_slug_idx" ON "SlotegratorGame"("slug");

    OPEN game_cursor;
    
    LOOP
        FETCH game_cursor INTO game_record;
        EXIT WHEN NOT FOUND;
        
        -- Convert provider to slug format (lowercase, split camelCase, replace non-alphanumeric with hyphens)
        provider_slug := LOWER(REGEXP_REPLACE(game_record.provider, '([a-z])([A-Z])', '\1-\2', 'g'));
        provider_slug := REGEXP_REPLACE(provider_slug, '[^a-z0-9]+', '-', 'g');
        provider_slug := REGEXP_REPLACE(provider_slug, '^-|-$', '', 'g');
        
        -- Convert name to slug format (lowercase, replace non-alphanumeric with hyphens)
        name_slug := LOWER(game_record.name);
        name_slug := REGEXP_REPLACE(name_slug, '[^a-z0-9]+', '-', 'g');
        name_slug := REGEXP_REPLACE(name_slug, '^-|-$', '', 'g');
        
        -- Combine to create the final slug
        slug_value := provider_slug || '-' || name_slug;
        
        -- Update the record
        UPDATE "SlotegratorGame" 
        SET slug = slug_value
        WHERE game_id = game_record.game_id;
    END LOOP;
    
    CLOSE game_cursor;
END $$;
