-- Expert call tracking and transcript analysis
CREATE TABLE IF NOT EXISTS expert_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transcript TEXT,
  speaker_labels JSONB DEFAULT '{}'::jsonb,
  focus_areas TEXT[],
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expert_calls_engagement ON expert_calls(engagement_id);
CREATE INDEX idx_expert_calls_status ON expert_calls(status);
CREATE INDEX idx_expert_calls_created ON expert_calls(created_at DESC);

-- Update trigger for expert_calls
CREATE OR REPLACE FUNCTION update_expert_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expert_calls_updated_at
  BEFORE UPDATE ON expert_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_calls_updated_at();
