-- Preserve users created before weather-region personalization was introduced.
-- On a fresh database Hibernate creates the table after this no-op migration.
DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS weather_region varchar(20);

        UPDATE users
        SET weather_region = 'SEOUL'
        WHERE weather_region IS NULL;

        ALTER TABLE users
            ALTER COLUMN weather_region SET DEFAULT 'SEOUL';

        ALTER TABLE users
            ALTER COLUMN weather_region SET NOT NULL;
    END IF;
END
$$;
