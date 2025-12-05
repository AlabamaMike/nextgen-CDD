# Slice 2: Evidence Management Design

**Date**: 2025-12-05
**Status**: Approved
**Scope**: Full evidence system with document parsing, PostgreSQL persistence, and frontend exploration

---

## Overview

Build out the evidence management system with real document parsing, PostgreSQL persistence as source of truth, and a frontend Evidence Explorer with research quality metrics.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Document parsing | All formats equally | PDF, DOCX, XLSX, PPTX, HTML, OCR all at once |
| Charting library | recharts | React-friendly, declarative, already in design doc |
| Storage strategy | PostgreSQL as source of truth | PG for metadata, vector DB for embeddings only |
| Document processing | BullMQ job queue | Async processing, already configured |

---

## Architecture

### Components

1. **PostgreSQL Tables** - `evidence`, `evidence_hypotheses`, `documents` for structured storage
2. **EvidenceRepository** - Repository pattern for CRUD operations
3. **DocumentRepository** - Repository for document metadata and status
4. **Real Document Parsers** - Replace placeholders with actual implementations
5. **BullMQ Document Worker** - Background processing for uploaded documents
6. **Evidence Explorer UI** - Filterable list with charts (recharts)

### Storage Strategy

- PostgreSQL is source of truth for all evidence metadata
- Vector DB (Ruvector) stores only embeddings, keyed by PostgreSQL evidence ID
- On create: PG first → generate embedding → store in vector DB
- On delete: remove from both stores
- Search: semantic search in vector DB returns IDs → hydrate from PostgreSQL

---

## Database Schema

Migration file: `002_evidence.sql`

```sql
-- Evidence table (metadata in PG, embeddings in Ruvector)
CREATE TABLE evidence (
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
  sentiment VARCHAR(20) NOT NULL
    CHECK (sentiment IN ('supporting', 'neutral', 'contradicting')),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  provenance JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_engagement ON evidence(engagement_id);
CREATE INDEX idx_evidence_source_type ON evidence(source_type);
CREATE INDEX idx_evidence_sentiment ON evidence(sentiment);
CREATE INDEX idx_evidence_credibility ON evidence(credibility);

-- Evidence-to-hypothesis links (many-to-many)
CREATE TABLE evidence_hypotheses (
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (evidence_id, hypothesis_id)
);

CREATE INDEX idx_ev_hyp_hypothesis ON evidence_hypotheses(hypothesis_id);

-- Documents table (uploaded files)
CREATE TABLE documents (
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
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_engagement ON documents(engagement_id);
CREATE INDEX idx_documents_status ON documents(status);
```

---

## Document Parsing

### Dependencies

```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0",
  "xlsx": "^0.18.5",
  "cheerio": "^1.0.0",
  "@google-cloud/documentai": "^8.0.0",
  "tesseract.js": "^5.0.0"
}
```

### Parser Implementations

| Format | Library | Implementation |
|--------|---------|----------------|
| PDF (text) | `pdf-parse` | Extract text, detect if scanned |
| PDF (scanned) | Document AI → tesseract.js fallback | OCR with confidence scores |
| DOCX | `mammoth` | Convert to HTML, then extract text |
| XLSX | `xlsx` (SheetJS) | Extract sheets as tables, preserve structure |
| PPTX | `xlsx` + custom | Extract slides as structured content |
| HTML | `cheerio` | Strip tags, decode entities, clean whitespace |

### OCR Strategy

1. PDF parser checks if text layer exists
2. If no text (scanned) → route to Document AI
3. If GCP unavailable → fallback to tesseract.js
4. Return extracted text with confidence metadata

### BullMQ Worker

File: `document-processor.worker.ts`

- Listens on `document-processing` queue
- Job payload: `{ documentId, engagementId, storagePath }`
- Processes document → updates `documents` table status
- Creates evidence records from chunks → stores embeddings in vector DB

---

## Repository Layer

### EvidenceRepository

File: `evidence-repository.ts`

Methods:
- `create(params)` - Insert evidence, return DTO
- `getById(id)` - Single evidence with linked hypotheses
- `getByEngagement(engagementId, filters)` - Filtered list with pagination
- `update(id, updates)` - Update credibility, sentiment, metadata
- `delete(id)` - Remove from PG (also cleanup vector DB)
- `linkToHypothesis(evidenceId, hypothesisId, relevanceScore)` - Create junction record
- `unlinkFromHypothesis(evidenceId, hypothesisId)` - Remove link
- `getStats(engagementId)` - Aggregated metrics

### DocumentRepository

File: `document-repository.ts`

Methods:
- `create(params)` - Insert document record
- `getById(id)` - Single document with status
- `getByEngagement(engagementId, filters)` - List with status filter
- `updateStatus(id, status, metadata)` - Called by worker
- `delete(id)` - Remove document and associated evidence

---

## API Updates

Replace in-memory Maps with repository calls in `evidence.ts`:

- `GET /evidence` - Use EvidenceRepository with filters
- `POST /evidence` - Create in PG, then generate embedding
- `PATCH /evidence/:id` - Update credibility/sentiment
- `DELETE /evidence/:id` - Remove from PG and vector DB
- `GET /evidence/stats` - New endpoint for research quality metrics
- `POST /documents` - Queue to BullMQ, return job ID
- `GET /documents/:id` - Poll status from DocumentRepository

---

## Frontend Components

### Dependencies

```json
{
  "recharts": "^2.10.0"
}
```

### Components

**EvidenceExplorer (`components/evidence/EvidenceExplorer.tsx`):**
- Filterable list/grid view of all evidence
- Filter controls: source type, sentiment, credibility slider, linked hypothesis
- Evidence cards with title, badges, snippet
- Click → detail panel

**EvidenceDetailPanel (`components/evidence/EvidenceDetailPanel.tsx`):**
- Full evidence content with provenance
- Linked hypotheses list
- Edit controls for credibility/sentiment

**ResearchQualityPanel (`components/evidence/ResearchQualityPanel.tsx`):**
- Source diversity pie chart (recharts PieChart)
- Credibility histogram (recharts BarChart)
- Summary stats: count, avg credibility, coverage %

### Hooks

File: `hooks/useEvidence.ts`

- `useEvidenceList(engagementId, filters)` - Paginated evidence query
- `useEvidence(engagementId, evidenceId)` - Single evidence detail
- `useEvidenceStats(engagementId)` - Research quality metrics
- `useCreateEvidence(engagementId)` - Mutation for manual add
- `useDocuments(engagementId)` - Document list with status

### Integration

Add "Evidence" tab to EngagementDetail alongside existing "Hypotheses" tab.

---

## Success Criteria

Slice 2 is complete when:

- [ ] Evidence and documents tables created via migration
- [ ] EvidenceRepository and DocumentRepository with full CRUD
- [ ] All document formats parse correctly (PDF, DOCX, XLSX, PPTX, HTML, OCR)
- [ ] BullMQ worker processes documents asynchronously
- [ ] Evidence API routes use PostgreSQL
- [ ] `/evidence/stats` endpoint returns quality metrics
- [ ] Evidence embeddings stored in vector DB with PG ID as key
- [ ] Evidence Explorer UI with filtering and detail panel
- [ ] Research quality charts (source diversity, credibility)
- [ ] Evidence tab integrated into EngagementDetail

## Out of Scope

- Contradiction management (Slice 3)
- Stress-test workflow (Slice 3)
- Conductor agent fixes (Slice 4)
