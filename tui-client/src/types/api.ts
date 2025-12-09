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

// ============== Hypothesis Types ==============

export type HypothesisType = 'thesis' | 'lever' | 'assumption' | 'risk' | 'dependency';
export type HypothesisStatus = 'proposed' | 'testing' | 'validated' | 'invalidated' | 'deferred';
export type HypothesisImportance = 'critical' | 'high' | 'medium' | 'low';
export type HypothesisTestability = 'easy' | 'moderate' | 'difficult';
export type CausalRelationship = 'supports' | 'contradicts' | 'depends_on' | 'leads_to' | 'mitigates';

export interface HypothesisData {
  id: string;
  engagement_id: string;
  type: HypothesisType;
  content: string;
  confidence: number;
  status: HypothesisStatus;
  importance: HypothesisImportance;
  testability: HypothesisTestability;
  parent_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CausalEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: CausalRelationship;
  strength: number;
  reasoning?: string;
  created_at: string;
}

export interface CreateHypothesisRequest {
  type: HypothesisType;
  content: string;
  parent_id?: string;
  confidence?: number;
  importance?: HypothesisImportance;
  testability?: HypothesisTestability;
}

export interface UpdateHypothesisRequest {
  content?: string;
  confidence?: number;
  status?: HypothesisStatus;
  importance?: HypothesisImportance;
  testability?: HypothesisTestability;
}

export interface CreateEdgeRequest {
  target_id: string;
  relationship: CausalRelationship;
  strength?: number;
  reasoning?: string;
}

export interface HypothesisTreeResponse {
  hypotheses: HypothesisData[];
  edges: CausalEdge[];
  count: number;
}

// ============== Evidence Types ==============

export type EvidenceSourceType = 'web' | 'document' | 'expert' | 'data' | 'filing' | 'financial';
export type EvidenceSentiment = 'supporting' | 'neutral' | 'contradicting';

export interface EvidenceData {
  id: string;
  engagement_id: string;
  content: string;
  source_type: EvidenceSourceType;
  source_url?: string;
  source_title?: string;
  source_author?: string;
  source_publication_date?: string;
  credibility: number;
  sentiment: EvidenceSentiment;
  document_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EvidenceFilters {
  source_type?: EvidenceSourceType;
  sentiment?: EvidenceSentiment;
  min_credibility?: number;
  hypothesis_id?: string;
  document_id?: string;
  limit?: number;
  offset?: number;
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

export interface EvidenceListResponse {
  evidence: EvidenceData[];
  total: number;
  limit: number;
  offset: number;
}

export interface EvidenceStats {
  total: number;
  by_source: Record<EvidenceSourceType, number>;
  by_sentiment: Record<EvidenceSentiment, number>;
  avg_credibility: number;
}

// ============== Contradiction Types ==============

export type ContradictionSeverity = 'low' | 'medium' | 'high';
export type ContradictionStatus = 'unresolved' | 'explained' | 'dismissed' | 'critical';

export interface ContradictionData {
  id: string;
  engagementId: string;
  hypothesisId: string | null;
  evidenceId: string | null;
  description: string;
  severity: ContradictionSeverity;
  status: ContradictionStatus;
  bearCaseTheme: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  metadata: Record<string, unknown>;
  foundAt: string;
  resolvedAt: string | null;
}

export interface ContradictionFilters {
  severity?: ContradictionSeverity;
  status?: ContradictionStatus;
  hypothesis_id?: string;
  limit?: number;
  offset?: number;
}

export interface ContradictionStats {
  totalCount: number;
  bySeverity: Record<ContradictionSeverity, number>;
  byStatus: Record<ContradictionStatus, number>;
  unresolvedCount: number;
  criticalCount: number;
  resolutionRate: number;
}

export interface CreateContradictionRequest {
  hypothesisId?: string;
  evidenceId?: string;
  description: string;
  severity: ContradictionSeverity;
  bearCaseTheme?: string;
}

export interface ResolveContradictionRequest {
  status: 'explained' | 'dismissed';
  resolutionNotes: string;
}

// ============== Stress Test Types ==============

export type StressTestStatus = 'pending' | 'running' | 'completed' | 'failed';
export type StressTestIntensity = 'light' | 'moderate' | 'aggressive';

export interface StressTestData {
  id: string;
  engagementId: string;
  intensity: StressTestIntensity;
  hypothesisIds: string[];
  status: StressTestStatus;
  results: StressTestResults | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface StressTestResults {
  contradictionsFound: number;
  hypothesesChallenged: number;
  bearCaseStrength: number;
  recommendations: string[];
  summary?: string;
}

export interface StartStressTestRequest {
  intensity?: StressTestIntensity;
  hypothesisIds?: string[];
}

export interface StressTestStats {
  totalRuns: number;
  byStatus: Record<StressTestStatus, number>;
  avgContradictionsFound: number;
  lastRunAt: string | null;
}

// ============== Metrics Types ==============

export type MetricType =
  | 'evidence_credibility_avg'
  | 'source_diversity_score'
  | 'hypothesis_coverage'
  | 'contradiction_resolution_rate'
  | 'overall_confidence'
  | 'stress_test_vulnerability'
  | 'research_completeness';

export interface MetricData {
  id: string;
  engagementId: string;
  metricType: MetricType;
  value: number;
  metadata: Record<string, unknown>;
  recordedAt: string;
}

export interface ResearchQualityMetrics {
  evidenceCredibilityAvg: number;
  sourceDiversityScore: number;
  hypothesisCoverage: number;
  contradictionResolutionRate: number;
  overallConfidence: number;
  lastUpdated: string | null;
}

export interface MetricsHistoryResponse {
  engagementId: string;
  metricType?: MetricType;
  history?: MetricData[];
  latest?: Record<MetricType, MetricData | null>;
}
