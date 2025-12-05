-- thesis-validator/src/db/migrations/000_engagements.sql
-- Base Engagements Table (must run before hypotheses and evidence migrations)

-- Create engagements table if not exists
-- Using IF NOT EXISTS to handle existing installations
CREATE TABLE IF NOT EXISTS engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_company VARCHAR(255) NOT NULL,
  sector VARCHAR(50) NOT NULL,
  description TEXT,
  deal_size NUMERIC(12,2),
  lead_partner VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'in_review', 'completed', 'archived')),
  config JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only add columns if they don't exist (handle upgrade from old schema)
DO $$
BEGIN
  -- Add target_company if missing (old schema used 'name')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'target_company') THEN
    -- If 'name' column exists, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'engagements' AND column_name = 'name') THEN
      ALTER TABLE engagements RENAME COLUMN name TO target_company;
    ELSE
      ALTER TABLE engagements ADD COLUMN target_company VARCHAR(255);
    END IF;
  END IF;

  -- Add sector if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'sector') THEN
    ALTER TABLE engagements ADD COLUMN sector VARCHAR(50) DEFAULT 'other';
  END IF;

  -- Add config if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'config') THEN
    ALTER TABLE engagements ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add description if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'description') THEN
    ALTER TABLE engagements ADD COLUMN description TEXT;
  END IF;

  -- Add deal_size if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'deal_size') THEN
    ALTER TABLE engagements ADD COLUMN deal_size NUMERIC(12,2);
  END IF;

  -- Add lead_partner if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'engagements' AND column_name = 'lead_partner') THEN
    ALTER TABLE engagements ADD COLUMN lead_partner VARCHAR(255);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_sector ON engagements(sector);
CREATE INDEX IF NOT EXISTS idx_engagements_created ON engagements(created_at DESC);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS engagements_updated_at ON engagements;
CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON engagements
  FOR EACH ROW
  EXECUTE FUNCTION update_engagements_updated_at();
