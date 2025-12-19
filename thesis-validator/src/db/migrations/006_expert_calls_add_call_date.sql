-- Add call_date column to expert_calls table
-- This stores when the expert call actually took place (vs created_at which is upload time)
ALTER TABLE expert_calls ADD COLUMN IF NOT EXISTS call_date TIMESTAMPTZ;
