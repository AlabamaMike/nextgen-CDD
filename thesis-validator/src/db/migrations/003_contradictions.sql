-- thesis-validator/src/db/migrations/003_contradictions.sql
-- Contradictions Table for Stress-Test Results

-- Contradictions found during stress-test
CREATE TABLE IF NOT EXISTS contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE SET NULL,
  evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved', 'explained', 'dismissed', 'critical')),
  bear_case_theme TEXT,
  resolution_notes TEXT,
  resolved_by VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  found_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contradictions_engagement ON contradictions(engagement_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_hypothesis ON contradictions(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_evidence ON contradictions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_severity ON contradictions(severity);
CREATE INDEX IF NOT EXISTS idx_contradictions_status ON contradictions(status);

-- Stress test configurations and results
CREATE TABLE IF NOT EXISTS stress_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  intensity VARCHAR(20) NOT NULL DEFAULT 'moderate'
    CHECK (intensity IN ('light', 'moderate', 'aggressive')),
  hypothesis_ids UUID[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stress_tests_engagement ON stress_tests(engagement_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_status ON stress_tests(status);

-- Research quality metrics (for analytics)
CREATE TABLE IF NOT EXISTS research_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_engagement ON research_metrics(engagement_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON research_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON research_metrics(recorded_at);

-- Update trigger for resolved_at
CREATE OR REPLACE FUNCTION update_contradiction_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('explained', 'dismissed') AND OLD.status = 'unresolved' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS contradictions_resolved_at ON contradictions;
CREATE TRIGGER contradictions_resolved_at
  BEFORE UPDATE ON contradictions
  FOR EACH ROW
  EXECUTE FUNCTION update_contradiction_resolved_at();
