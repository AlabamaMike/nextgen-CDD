# Full Workflow Build-out Design

**Date**: 2025-12-05
**Status**: Approved
**Scope**: Hypothesis, Evidence, and Monitoring capabilities for full workflow execution

## Overview

Build out the MVP into a fully functional system where users can execute complete research and stress-test workflows. This includes hypothesis management, evidence gathering with real document parsing, contradiction hunting, and research quality monitoring.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow priority | Both research AND stress-test equally | Users need full cycle |
| Frontend depth | All three areas (hypothesis, evidence, contradictions) | Full visibility required |
| Storage strategy | PostgreSQL + Vector DB hybrid | Structured CRUD in PG, semantic search in Ruvector |
| Document formats | All + OCR | PDF, DOCX, XLSX, PPTX, HTML, scanned documents |
| Stress-test intensity | Configurable per engagement | Different deal stages need different scrutiny |
| Analytics focus | Research quality metrics | Credibility, source diversity, hypothesis coverage |
| Build sequence | Vertical slices | Complete features end-to-end incrementally |

---

## Build Sequence: Vertical Slices

### Slice 1: Hypothesis Management (Foundation)

Complete the hypothesis lifecycle end-to-end:

- PostgreSQL tables for hypotheses and causal edges
- CRUD API endpoints (create, read, update, delete hypotheses)
- Hypothesis tree visualization in React (interactive graph with reactflow)
- Wire existing HypothesisBuilder agent to persist to PostgreSQL

### Slice 2: Evidence Management

Full evidence system with document support:

- PostgreSQL tables for evidence and document metadata
- Real document parsers (PDF, DOCX, XLSX, PPTX, HTML, OCR)
- Evidence exploration UI with filtering/linking
- Credibility scoring and source diversity metrics

### Slice 3: Contradiction & Stress-Test

Complete the adversarial analysis capability:

- Finish ContradictionHunter agent implementation
- PostgreSQL tables for contradictions with resolution tracking
- Contradiction dashboard UI with severity indicators
- Configurable intensity (light/balanced/aggressive) per engagement

### Slice 4: Workflow Integration

Wire everything together:

- Fix Conductor agent to use real agents (not mocks)
- Complete stress-test workflow
- End-to-end research → stress-test pipeline
- Research quality analytics dashboard

---

## Database Schema

PostgreSQL tables to add alongside existing vector DB:

```sql
-- Hypotheses (structured data, vector embedding stays in Ruvector)
CREATE TABLE hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES hypotheses(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('thesis', 'sub_thesis', 'assumption')),
  content TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'untested'
    CHECK (status IN ('untested', 'supported', 'challenged', 'refuted')),
  importance VARCHAR(20) CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  testability VARCHAR(20) CHECK (testability IN ('easy', 'moderate', 'difficult')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hypotheses_engagement ON hypotheses(engagement_id);
CREATE INDEX idx_hypotheses_parent ON hypotheses(parent_id);
CREATE INDEX idx_hypotheses_status ON hypotheses(status);

-- Causal relationships between hypotheses
CREATE TABLE hypothesis_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  relationship VARCHAR(20) NOT NULL
    CHECK (relationship IN ('requires', 'supports', 'contradicts', 'implies')),
  strength DECIMAL(3,2) CHECK (strength >= 0 AND strength <= 1),
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_id, target_id, relationship)
);

CREATE INDEX idx_edges_source ON hypothesis_edges(source_id);
CREATE INDEX idx_edges_target ON hypothesis_edges(target_id);

-- Evidence records (embeddings in vector DB, metadata here)
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL
    CHECK (source_type IN ('web', 'document', 'expert', 'data', 'filing', 'financial')),
  source_url TEXT,
  source_title TEXT,
  source_author TEXT,
  source_publication_date DATE,
  credibility DECIMAL(3,2) CHECK (credibility >= 0 AND credibility <= 1),
  sentiment VARCHAR(20) NOT NULL
    CHECK (sentiment IN ('supporting', 'neutral', 'contradicting')),
  provenance JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  retrieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evidence_engagement ON evidence(engagement_id);
CREATE INDEX idx_evidence_source_type ON evidence(source_type);
CREATE INDEX idx_evidence_sentiment ON evidence(sentiment);
CREATE INDEX idx_evidence_credibility ON evidence(credibility);

-- Evidence-to-hypothesis links
CREATE TABLE evidence_hypotheses (
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (evidence_id, hypothesis_id)
);

CREATE INDEX idx_ev_hyp_hypothesis ON evidence_hypotheses(hypothesis_id);

-- Documents uploaded to data room
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  format VARCHAR(20) NOT NULL
    CHECK (format IN ('pdf', 'docx', 'xlsx', 'pptx', 'html', 'image', 'unknown')),
  mime_type TEXT,
  size_bytes INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  chunk_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_engagement ON documents(engagement_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Contradictions found during stress-test
CREATE TABLE contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  hypothesis_id UUID REFERENCES hypotheses(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved', 'explained', 'dismissed', 'critical')),
  bear_case_theme TEXT,
  supporting_evidence_ids UUID[] DEFAULT '{}',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  found_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contradictions_engagement ON contradictions(engagement_id);
CREATE INDEX idx_contradictions_hypothesis ON contradictions(hypothesis_id);
CREATE INDEX idx_contradictions_severity ON contradictions(severity);
CREATE INDEX idx_contradictions_status ON contradictions(status);

-- Research quality metrics (for analytics)
CREATE TABLE research_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_metrics_engagement ON research_metrics(engagement_id);
CREATE INDEX idx_metrics_type ON research_metrics(metric_type);
CREATE INDEX idx_metrics_recorded ON research_metrics(recorded_at);

-- Stress test configurations and results
CREATE TABLE stress_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  intensity VARCHAR(20) NOT NULL DEFAULT 'balanced'
    CHECK (intensity IN ('light', 'balanced', 'aggressive')),
  hypothesis_ids UUID[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stress_tests_engagement ON stress_tests(engagement_id);
CREATE INDEX idx_stress_tests_status ON stress_tests(status);
```

---

## Document Parsing Architecture

### Parser Selection by Format

| Format | Library | Notes |
|--------|---------|-------|
| PDF (text) | `pdf-parse` | Fast, handles most business PDFs |
| PDF (scanned/OCR) | `@google-cloud/documentai` | Already on GCP, high accuracy |
| DOCX | `mammoth` | Converts to HTML, preserves structure |
| XLSX | `xlsx` (SheetJS) | Full spreadsheet support, formula evaluation |
| PPTX | `officegen` + custom | Extract slides as structured content |
| HTML | `cheerio` | Clean extraction, handle data room exports |
| Fallback OCR | `tesseract.js` | Offline fallback if GCP unavailable |

### Processing Pipeline

```
Upload → Format Detection → Parser Selection →
  → Text Extraction → Chunking (1000 chars, 200 overlap) →
  → Embedding Generation → Store (PostgreSQL metadata + Ruvector vectors)
```

### OCR Strategy

1. Detect if PDF contains actual text or just images
2. If images only → route to Document AI
3. Document AI returns structured text with confidence scores
4. Fall back to `tesseract.js` if GCP unavailable

### Chunking Strategy

- **Default**: 1000 characters with 200 character overlap
- **Tables/Spreadsheets**: Keep rows together, don't split mid-row
- **Headers**: Preserve section context in chunk metadata
- **Financial statements**: Special handling to keep related line items together

---

## Frontend Components

### Hypothesis Tree Visualization

**Library**: `reactflow`

**Features**:
- Zoomable/pannable canvas showing thesis → sub-thesis → assumption hierarchy
- Nodes color-coded by status:
  - Green = supported
  - Yellow = challenged
  - Red = refuted
  - Gray = untested
- Node size reflects importance (critical nodes larger)
- Edges show causal relationships with labels (requires, supports, contradicts)
- Click node → side panel shows details, linked evidence, confidence history
- Confidence scores displayed on each node with visual indicator

**Layout**: Top-down tree layout, thesis at top, assumptions at bottom

### Evidence Explorer

**Features**:
- Filterable list/grid view of all evidence
- Filters: source type, sentiment, credibility range, linked hypothesis
- Each card shows: title, source, credibility score, sentiment badge, snippet
- Click → full evidence detail with provenance certificate
- Source diversity chart (pie/bar showing distribution by source type)
- Credibility distribution histogram

### Contradiction Dashboard

**Features**:
- List view sorted by severity (high → medium → low)
- Status badges:
  - Unresolved = red
  - Explained = yellow
  - Dismissed = gray
  - Critical = pulsing red
- Bear case theme grouping (group related contradictions)
- Resolution workflow: click → add notes → change status
- Linked hypothesis shown for each contradiction
- Intensity selector for stress-test configuration

### Research Quality Panel

**Metrics displayed**:
- Evidence credibility average (gauge chart)
- Source diversity score (distribution across source types)
- Hypothesis coverage (% of hypotheses with linked evidence)
- Contradiction resolution rate

---

## Agent Completions

### Contradiction Hunter Agent

Complete implementation with:

- Full adversarial research logic with configurable intensity
- Integration with web search for contrarian sources:
  - Search patterns: "[company] problems", "[company] lawsuit", "[company] criticism", competitor analyses
- Bear case scenario generation using LLM
- Vulnerability identification across categories:
  - Market risks
  - Competitive risks
  - Operational risks
  - Financial risks
  - Regulatory risks
- Severity scoring based on likelihood × impact
- Link contradictions to specific hypotheses they challenge

**Intensity Levels**:

| Level | Behavior |
|-------|----------|
| Light | Surface contradictions from existing evidence only |
| Balanced | Search 3-5 contrarian sources per key hypothesis |
| Aggressive | Deep search (10+ sources), generate devil's advocate scenarios, challenge every assumption |

### Conductor Agent Fixes

Replace mock methods with real agent calls:

- `generateHypotheses()` → Call actual HypothesisBuilder agent
- `gatherEvidence()` → Call actual EvidenceGatherer agent
- `huntContradictions()` → Call actual ContradictionHunter agent
- `executePhase2()` → Wire up ComparablesFinder and ExpertSynthesizer

### Stress-Test Workflow

Complete implementation:

1. Accept intensity configuration (light/balanced/aggressive)
2. Optionally scope to specific hypothesis IDs
3. Run ContradictionHunter with configured intensity
4. Generate bear case summary
5. Update hypothesis confidence scores based on contradictions found
6. Emit real-time progress events
7. Return structured stress-test results

---

## API Additions

### Hypothesis CRUD

```
POST   /engagements/:id/hypotheses              Create hypothesis manually
GET    /engagements/:id/hypotheses/:hid         Get single hypothesis with edges and evidence
PATCH  /engagements/:id/hypotheses/:hid         Update confidence/status/content
DELETE /engagements/:id/hypotheses/:hid         Archive hypothesis

POST   /engagements/:id/hypotheses/:hid/edges   Create causal edge to another hypothesis
DELETE /engagements/:id/hypothesis-edges/:eid   Remove causal edge
```

### Evidence Additions

```
PATCH  /engagements/:id/evidence/:eid           Update credibility/metadata
DELETE /engagements/:id/evidence/:eid           Remove evidence
GET    /engagements/:id/evidence/stats          Research quality metrics
```

### Stress-Test

```
POST   /engagements/:id/stress-test             Execute stress-test (add intensity config)
GET    /engagements/:id/stress-test/results     Get latest stress-test results
GET    /engagements/:id/stress-tests            List all stress-tests for engagement
GET    /engagements/:id/stress-tests/:stid      Get specific stress-test details
```

### Research Quality

```
GET    /engagements/:id/metrics                 Current quality metrics
GET    /engagements/:id/metrics/history         Metrics over time for trends
```

---

## Storage Layer Changes

### Repository Pattern

Create repository classes to abstract database access:

- `HypothesisRepository` - CRUD + tree queries
- `EvidenceRepository` - CRUD + search + stats
- `ContradictionRepository` - CRUD + resolution workflow
- `DocumentRepository` - Upload + processing status
- `MetricsRepository` - Recording + aggregation

### Replace In-Memory Stores

| Current | Replace With |
|---------|--------------|
| `Map<string, Engagement>` | PostgreSQL `engagements` table |
| In-memory job store | Redis via BullMQ (already configured) |
| Engagement state | PostgreSQL with status column |

### Dual Storage Coordination

For entities with embeddings (hypotheses, evidence, documents):

1. Store structured data in PostgreSQL (source of truth for metadata)
2. Store embeddings in Ruvector with PostgreSQL ID as key
3. On delete: remove from both stores
4. Search: query Ruvector for semantic matches, hydrate from PostgreSQL

---

## Dependencies to Add

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "xlsx": "^0.18.5",
    "cheerio": "^1.0.0",
    "@google-cloud/documentai": "^8.0.0",
    "tesseract.js": "^5.0.0"
  },
  "devDependencies": {}
}
```

Frontend:
```json
{
  "dependencies": {
    "reactflow": "^11.10.0",
    "recharts": "^2.10.0"
  }
}
```

---

## Success Criteria

### Slice 1 Complete When:
- [ ] Hypotheses persist to PostgreSQL
- [ ] CRUD API endpoints work with authentication
- [ ] Hypothesis tree renders in UI with correct colors/sizes
- [ ] Clicking a node shows details panel
- [ ] HypothesisBuilder agent saves to PostgreSQL

### Slice 2 Complete When:
- [ ] Evidence persists to PostgreSQL with vector embeddings in Ruvector
- [ ] All document formats parse correctly (manual testing with sample files)
- [ ] Evidence explorer shows filterable list
- [ ] Source diversity and credibility metrics display

### Slice 3 Complete When:
- [ ] ContradictionHunter runs with configurable intensity
- [ ] Contradictions persist with resolution workflow
- [ ] Dashboard shows contradictions sorted by severity
- [ ] Users can resolve contradictions with notes

### Slice 4 Complete When:
- [ ] Conductor uses real agents (no mocks)
- [ ] Full research → stress-test pipeline executes
- [ ] Research quality dashboard shows all metrics
- [ ] End-to-end test passes: submit thesis → get validated results
