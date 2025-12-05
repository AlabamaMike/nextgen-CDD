-- thesis-validator/src/db/migrations/002_evidence.sql
-- Evidence Management Tables

-- Documents table (must come first due to FK reference)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  format VARCHAR(20) NOT NULL
    CHECK (format IN ('pdf', 'docx', 'xlsx', 'pptx', 'html', 'image', 'unknown')),
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_documents_engagement ON documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Evidence table
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL,
  content TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL
    CHECK (source_type IN ('web', 'document', 'expert', 'data', 'filing', 'financial')),
  source_url TEXT,
  source_title TEXT,
  source_author TEXT,
  source_publication_date DATE,
  credibility DECIMAL(3,2) CHECK (credibility >= 0 AND credibility <= 1),
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral'
    CHECK (sentiment IN ('supporting', 'neutral', 'contradicting')),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  provenance JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  retrieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_engagement ON evidence(engagement_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source_type ON evidence(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_sentiment ON evidence(sentiment);
CREATE INDEX IF NOT EXISTS idx_evidence_credibility ON evidence(credibility);
CREATE INDEX IF NOT EXISTS idx_evidence_document ON evidence(document_id);

-- Evidence-to-hypothesis junction table
CREATE TABLE IF NOT EXISTS evidence_hypotheses (
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (evidence_id, hypothesis_id)
);

CREATE INDEX IF NOT EXISTS idx_ev_hyp_hypothesis ON evidence_hypotheses(hypothesis_id);
