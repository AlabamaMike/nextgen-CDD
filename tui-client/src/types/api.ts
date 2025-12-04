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
  type: 'research' | 'stress_test';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: number;
  completed_at?: number;
  error?: string;
  result?: unknown;
}

export interface ResearchConfig {
  depth: 'quick' | 'standard' | 'deep';
  focus_areas?: string[];
  include_comparables?: boolean;
  max_sources?: number;
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
