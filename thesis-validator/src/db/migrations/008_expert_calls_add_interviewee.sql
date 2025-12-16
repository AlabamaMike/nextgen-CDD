-- Add interviewee metadata columns
-- Stores parsed interviewee name and title from transcript/filename
ALTER TABLE expert_calls ADD COLUMN IF NOT EXISTS interviewee_name VARCHAR(255);
ALTER TABLE expert_calls ADD COLUMN IF NOT EXISTS interviewee_title VARCHAR(255);
ALTER TABLE expert_calls ADD COLUMN IF NOT EXISTS source_filename VARCHAR(500);

-- Index for searching by interviewee
CREATE INDEX IF NOT EXISTS idx_expert_calls_interviewee_name
  ON expert_calls(interviewee_name)
  WHERE interviewee_name IS NOT NULL;
