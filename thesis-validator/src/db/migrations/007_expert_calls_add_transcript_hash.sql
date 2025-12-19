-- Add transcript_hash column for duplicate detection
-- Hash is computed from normalized transcript content
ALTER TABLE expert_calls ADD COLUMN IF NOT EXISTS transcript_hash VARCHAR(64);

-- Create unique index per engagement to prevent duplicate transcripts
CREATE UNIQUE INDEX IF NOT EXISTS idx_expert_calls_engagement_hash
  ON expert_calls(engagement_id, transcript_hash)
  WHERE transcript_hash IS NOT NULL;

-- Create regular index for hash lookups
CREATE INDEX IF NOT EXISTS idx_expert_calls_transcript_hash
  ON expert_calls(transcript_hash)
  WHERE transcript_hash IS NOT NULL;
