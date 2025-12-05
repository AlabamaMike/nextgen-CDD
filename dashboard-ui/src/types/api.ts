/**
 * API Types - Shared types for Thesis Validator API
 */

export interface Engagement {
  id: string;
  name: string;
  target: {
    name: string;
    sector: string;
    location?: string;
  };
  deal_type: 'buyout' | 'growth' | 'venture' | 'bolt-on';
  status: 'pending' | 'research_active' | 'research_complete' | 'research_failed' | 'completed';
  thesis?: {
    statement: string;
    submitted_at: number;
  };
  created_at: number;
  updated_at: number;
  created_by: string;
}

export interface EngagementFilters {
  status?: string;
  sector?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEngagementRequest {
  name: string;
  target: {
    name: string;
    sector: string;
    location?: string;
  };
  deal_type: 'buyout' | 'growth' | 'venture' | 'bolt-on';
  thesis_statement?: string;
}

export interface UpdateEngagementRequest {
  name?: string;
  target?: {
    name?: string;
    sector?: string;
    location?: string;
  };
  status?: Engagement['status'];
  thesis_statement?: string;
}

export interface ResearchJob {
  id: string;
  engagement_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  started_at?: number;
  completed_at?: number;
  error_message?: string;
  confidence_score?: number;
  results?: ResearchResults;
  config: ResearchConfig;
  created_at: number;
  updated_at: number;
}

export interface ResearchConfig {
  maxHypotheses?: number;
  enableDeepDive?: boolean;
  confidenceThreshold?: number;
  searchDepth?: 'quick' | 'standard' | 'thorough';
}

export interface ResearchResults {
  verdict: 'proceed' | 'review' | 'reject';
  summary: string;
  key_findings: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface StartResearchRequest {
  thesis: string;
  config?: Partial<ResearchConfig>;
}

export interface Hypothesis {
  id: string;
  job_id: string;
  statement: string;
  testable: boolean;
  priority: number;
  validation_status: 'pending' | 'validated' | 'rejected' | 'inconclusive';
  evidence_summary?: string;
  created_at: number;
}

export interface EvidenceItem {
  id: string;
  engagement_id: string;
  job_id: string;
  type: 'supporting' | 'contradicting' | 'neutral';
  hypothesis: string;
  content: string;
  source_url?: string;
  source_type?: string;
  confidence: number;
  created_at: number;
}

export interface ProgressEvent {
  type: 'status_update' | 'phase_start' | 'phase_complete' | 'hypothesis_generated' |
        'evidence_found' | 'contradiction_detected' | 'round_complete' | 'job_complete' |
        'completed' | 'error';
  jobId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
}

export interface SystemMetrics {
  timestamp: number;
  websocket: {
    total_connections: number;
    connections_by_engagement: Record<string, number>;
  };
  expert_calls: {
    active_sessions: number;
    sessions: Array<{
      session_id: string;
      engagement_id: string;
      user_id: string;
      started_at: number;
      chunks_processed: number;
    }>;
  };
  memory: {
    heap_used: number;
    heap_total: number;
    rss: number;
  };
  uptime: number;
}

export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

export interface HypothesisNode {
  id: string;
  engagementId: string;
  parentId: string | null;
  type: 'thesis' | 'sub_thesis' | 'assumption';
  content: string;
  confidence: number;
  status: 'untested' | 'supported' | 'challenged' | 'refuted';
  importance: 'critical' | 'high' | 'medium' | 'low' | null;
  testability: 'easy' | 'moderate' | 'difficult' | null;
  createdAt: string;
  updatedAt: string;
}

export interface HypothesisEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: 'requires' | 'supports' | 'contradicts' | 'implies';
  strength: number;
  reasoning: string | null;
}

export interface HypothesisTree {
  hypotheses: HypothesisNode[];
  edges: HypothesisEdge[];
  count: number;
}

export interface CreateHypothesisRequest {
  type: 'thesis' | 'sub_thesis' | 'assumption';
  content: string;
  parent_id?: string;
  confidence?: number;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  testability?: 'easy' | 'moderate' | 'difficult';
}

export interface UpdateHypothesisRequest {
  content?: string;
  confidence?: number;
  status?: 'untested' | 'supported' | 'challenged' | 'refuted';
  importance?: 'critical' | 'high' | 'medium' | 'low';
  testability?: 'easy' | 'moderate' | 'difficult';
}

// Evidence types
export type EvidenceSourceType = 'web' | 'document' | 'expert' | 'data' | 'filing' | 'financial';
export type EvidenceSentiment = 'supporting' | 'neutral' | 'contradicting';

export interface Evidence {
  id: string;
  engagementId: string;
  content: string;
  sourceType: EvidenceSourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourcePublicationDate: string | null;
  credibility: number | null;
  sentiment: EvidenceSentiment;
  documentId: string | null;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
  retrievedAt: string | null;
  createdAt: string;
  linkedHypotheses?: Array<{ hypothesisId: string; relevanceScore: number }>;
}

export interface EvidenceFilters {
  sourceType?: EvidenceSourceType;
  sentiment?: EvidenceSentiment;
  minCredibility?: number;
  hypothesisId?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}

export interface EvidenceStats {
  totalCount: number;
  bySourceType: Record<string, number>;
  bySentiment: Record<string, number>;
  averageCredibility: number;
  hypothesisCoverage: number;
}

export interface CreateEvidenceRequest {
  content: string;
  sourceType: EvidenceSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourcePublicationDate?: string;
  credibility?: number;
  sentiment?: EvidenceSentiment;
  hypothesisIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateEvidenceRequest {
  content?: string;
  credibility?: number;
  sentiment?: EvidenceSentiment;
  metadata?: Record<string, unknown>;
}

// Document types
export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'image' | 'unknown';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  engagementId: string;
  filename: string;
  originalFilename: string;
  format: DocumentFormat;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  uploadedBy: string | null;
  uploadedAt: string;
  processedAt: string | null;
}

export interface DocumentFilters {
  status?: DocumentStatus;
  format?: DocumentFormat;
  limit?: number;
  offset?: number;
}
