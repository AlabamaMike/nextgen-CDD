# Thesis Validator Memory System

The **Thesis Validator** employs a sophisticated, multi-tiered memory system built on top of **Ruvector** (a vector database abstraction) to manage research data, institutional knowledge, and market intelligence.

## Architecture Overview

The memory system is designed with specific goals:
1.  **Isolation**: Deal-specific data is strictly isolated in `DealMemory`.
2.  **Persistence**: Institutional knowledge accumulates over time in `InstitutionalMemory`.
3.  **Explainability**: All retrievals support "provenance certificates" to explain why data was retrieved.
4.  **Causal Reasoning**: Supports graph-based storage for hypothesis trees and causal links.

```mermaid
graph TD
    subgraph "Application Layer"
        Agents[AI Agents]
        API[API Services]
    end

    subgraph "Memory Abstraction Layer"
        DM[Deal Memory]
        IM[Institutional Memory]
        MI[Market Intelligence]
    end

    subgraph "Core Infrastructure"
        RC[Ruvector Client]
        Config[Schema Configuration]
    end

    subgraph "Storage Layer"
        Vector[Vector Index (HNSW)]
        Payload[Payload Storage]
        Graph[Causal Graph]
    end

    Agents --> DM
    Agents --> IM
    API --> DM
    
    DM --> RC
    IM --> RC
    MI --> RC
    
    RC --> Config
    RC --> Vector
    RC --> Payload
    RC --> Graph
```

## Core Technologies

### Ruvector
**Ruvector** is the underlying vector database engine. In the current implementation (`src/memory/ruvector-client.ts`), it is abstracted as a high-level client that supports:
- **Vector Operations**: Insert, Search (Cosine Similarity), Delete.
- **Hybrid Search**: Semantic search combined with metadata filtering.
- **Graph Operations**: Managing causal edges between nodes (e.g., Hypothesis A -> causes -> Hypothesis B).
- **Provenance**: Generating certificates for retrieved data (Merkle proofs, similarity scores).

## Memory Tiers

### 1. Deal Memory (`DealMemory`)
**Scope**: Per-engagement (isolated).
**Purpose**: Stores all data related to a specific due diligence project.

**Namespaces**:
- `hypotheses`: Validation tree nodes.
- `evidence`: Collected facts, data shards, and web content.
- `graph`: Causal relationships between hypotheses.
- `transcripts`: Expert call transcripts with speaker attribution.
- `documents`: Data room document chunks.
- `logs`: Research action logs.

**Key Features**:
- **Causal Graph**: Maps how one hypothesis supports or contradicts another.
- **Contradiction Tracking**: Explicitly stores and links contradicting evidence.

### 2. Institutional Memory (`InstitutionalMemory`)
**Scope**: Global (cross-engagement).
**Purpose**: Accumulates firm-wide knowledge and reusable assets.

**Namespaces**:
- `reflexion`: Agent learning episodes (what worked/failed).
- `skills_library`: Reusable analytical skills/tools.
- `patterns`: Anonymized deal patterns and outcomes.
- `sector_knowledge`: General market wisdom.

### 3. Market Intelligence (`MarketIntelligence`)
**Scope**: Global / Temporal.
**Purpose**: Real-time market signals and news.
**Features**: Temporal decay (older signals matter less).

## Schemas

Configuration is defined in `src/config/ruvector.ts`.

| Collection | Vector Size | Metric | Key Fields |
|------------|-------------|--------|------------|
| **hypotheses** | 1536 | Cosine | `status`, `confidence`, `type` |
| **evidence** | 1536 | Cosine | `source_type`, `credibility_score`, `sentiment` |
| **skills** | 1536 | Cosine | `category`, `success_rate`, `usage_count` |
| **reflexion** | 1536 | Cosine | `task_type`, `outcome_score`, `was_successful` |

## Usage Examples

### initializing Deal Memory
```typescript
import { createDealMemory } from './memory/deal-memory.js';

const engagementId = 'deal-123';
const memory = await createDealMemory(engagementId);
```

### Adding a Hypothesis
```typescript
const hypothesis = await memory.createHypothesis({
  type: 'value_driver',
  content: 'Target company has pricing power due to high switching costs.',
  parent_id: 'root-thesis',
  relationship: 'supports',
  confidence: 0.85
}, 'agent-conductor');
```

### Searching Evidence
```typescript
// Search for evidence related to "churn rate"
const queryVector = await embeddingService.embed('churn rate statistics');
const results = await memory.searchEvidence(queryVector, {
  top_k: 5,
  min_score: 0.7
});

results.forEach(result => {
  console.log(`Found evidence (score: ${result.score}): ${result.content}`);
});
```

### Storing a Lesson Learned (Institutional Memory)
```typescript
import { getInstitutionalMemory } from './memory/institutional-memory.js';

const instMemory = getInstitutionalMemory();

await instMemory.storeReflexion('deal-123', {
  task_type: 'market_sizing',
  outcome_score: 0.4, // Failed
  was_successful: false,
  self_critique: 'Failed to account for shadow market size in TAM calculation.',
  metadata: { sector: 'SaaS' }
});
```
