-- thesis-validator/src/db/migrations/005_add_thesis_column.sql
-- Add thesis column to engagements table for thesis persistence

DO $$
BEGIN
  -- Add thesis JSONB column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'thesis') THEN
    ALTER TABLE engagements ADD COLUMN thesis JSONB;
  END IF;
END $$;
