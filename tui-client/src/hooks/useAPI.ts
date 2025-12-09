import { useState, useEffect, useMemo, useCallback } from 'react';
import { ThesisValidatorClient } from '../api/client.js';
import type {
  Engagement,
  EngagementFilters,
  HypothesisData,
  CausalEdge,
  EvidenceData,
  EvidenceFilters,
  EvidenceStats,
  ContradictionData,
  ContradictionFilters,
  ContradictionStats,
  StressTestData,
  StressTestStats,
  ResearchQualityMetrics,
  MetricData,
  MetricType,
} from '../types/api.js';

interface UseEngagementsResult {
  engagements: Engagement[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEngagements(
  serverUrl: string,
  authToken?: string,
  filters?: EngagementFilters
): UseEngagementsResult {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create API client instance (memoized to avoid recreation)
  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchEngagements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.getEngagements(filters);
      setEngagements(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch engagements';
      setError(errorMessage);
      setEngagements([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    void fetchEngagements();
  }, [serverUrl, JSON.stringify(filters)]);

  return {
    engagements,
    loading,
    error,
    refresh: fetchEngagements,
  };
}

interface UseHealthCheckResult {
  isOnline: boolean;
  checking: boolean;
}

export function useHealthCheck(serverUrl: string): UseHealthCheckResult {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const client = useMemo(() => new ThesisValidatorClient(serverUrl), [serverUrl]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setChecking(true);
        await client.getHealth();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      } finally {
        setChecking(false);
      }
    };

    // Initial check
    void checkHealth();

    // Check every 30 seconds
    const interval = setInterval(() => {
      void checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [serverUrl]);

  return { isOnline, checking };
}

// ============== Hypothesis Hook ==============

interface UseHypothesesResult {
  hypotheses: HypothesisData[];
  edges: CausalEdge[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHypotheses(
  serverUrl: string,
  authToken: string | undefined,
  engagementId: string | null
): UseHypothesesResult {
  const [hypotheses, setHypotheses] = useState<HypothesisData[]>([]);
  const [edges, setEdges] = useState<CausalEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchHypotheses = useCallback(async () => {
    if (!engagementId) {
      setHypotheses([]);
      setEdges([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await client.getHypotheses(engagementId);
      setHypotheses(data.hypotheses);
      setEdges(data.edges);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch hypotheses';
      setError(errorMessage);
      setHypotheses([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId]);

  useEffect(() => {
    void fetchHypotheses();
  }, [fetchHypotheses]);

  return {
    hypotheses,
    edges,
    loading,
    error,
    refresh: fetchHypotheses,
  };
}

// ============== Evidence Hook ==============

interface UseEvidenceResult {
  evidence: EvidenceData[];
  stats: EvidenceStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvidence(
  serverUrl: string,
  authToken: string | undefined,
  engagementId: string | null,
  filters?: EvidenceFilters
): UseEvidenceResult {
  const [evidence, setEvidence] = useState<EvidenceData[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchEvidence = useCallback(async () => {
    if (!engagementId) {
      setEvidence([]);
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [evidenceData, statsData] = await Promise.all([
        client.getEvidence(engagementId, filters),
        client.getEvidenceStats(engagementId),
      ]);
      setEvidence(evidenceData);
      setStats(statsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch evidence';
      setError(errorMessage);
      setEvidence([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId, JSON.stringify(filters)]);

  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  return {
    evidence,
    stats,
    loading,
    error,
    refresh: fetchEvidence,
  };
}

// ============== Contradiction Hook ==============

interface UseContradictionsResult {
  contradictions: ContradictionData[];
  stats: ContradictionStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContradictions(
  serverUrl: string,
  authToken: string | undefined,
  engagementId: string | null,
  filters?: ContradictionFilters
): UseContradictionsResult {
  const [contradictions, setContradictions] = useState<ContradictionData[]>([]);
  const [stats, setStats] = useState<ContradictionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchContradictions = useCallback(async () => {
    if (!engagementId) {
      setContradictions([]);
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [contradictionsData, statsData] = await Promise.all([
        client.getContradictions(engagementId, filters),
        client.getContradictionStats(engagementId),
      ]);
      setContradictions(contradictionsData);
      setStats(statsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch contradictions';
      setError(errorMessage);
      setContradictions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId, JSON.stringify(filters)]);

  useEffect(() => {
    void fetchContradictions();
  }, [fetchContradictions]);

  return {
    contradictions,
    stats,
    loading,
    error,
    refresh: fetchContradictions,
  };
}

// ============== Stress Test Hook ==============

interface UseStressTestsResult {
  stressTests: StressTestData[];
  stats: StressTestStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStressTests(
  serverUrl: string,
  authToken: string | undefined,
  engagementId: string | null,
  filters?: { status?: string; limit?: number }
): UseStressTestsResult {
  const [stressTests, setStressTests] = useState<StressTestData[]>([]);
  const [stats, setStats] = useState<StressTestStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchStressTests = useCallback(async () => {
    if (!engagementId) {
      setStressTests([]);
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [testsData, statsData] = await Promise.all([
        client.getStressTests(engagementId, filters),
        client.getStressTestStats(engagementId),
      ]);
      setStressTests(testsData);
      setStats(statsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch stress tests';
      setError(errorMessage);
      setStressTests([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId, JSON.stringify(filters)]);

  useEffect(() => {
    void fetchStressTests();
  }, [fetchStressTests]);

  return {
    stressTests,
    stats,
    loading,
    error,
    refresh: fetchStressTests,
  };
}

// ============== Metrics Hook ==============

interface UseMetricsResult {
  metrics: ResearchQualityMetrics | null;
  history: MetricData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  calculate: () => Promise<void>;
}

export function useMetrics(
  serverUrl: string,
  authToken: string | undefined,
  engagementId: string | null,
  historyMetricType?: MetricType
): UseMetricsResult {
  const [metrics, setMetrics] = useState<ResearchQualityMetrics | null>(null);
  const [history, setHistory] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  const fetchMetrics = useCallback(async () => {
    if (!engagementId) {
      setMetrics(null);
      setHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const metricsData = await client.getResearchMetrics(engagementId);
      setMetrics(metricsData);

      // Fetch history if metric type specified
      if (historyMetricType) {
        const historyData = await client.getMetricHistory(engagementId, historyMetricType);
        setHistory(historyData);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch metrics';
      setError(errorMessage);
      setMetrics(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId, historyMetricType]);

  const calculateMetrics = useCallback(async () => {
    if (!engagementId) return;

    try {
      setLoading(true);
      setError(null);
      const metricsData = await client.calculateMetrics(engagementId);
      setMetrics(metricsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to calculate metrics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client, engagementId]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    history,
    loading,
    error,
    refresh: fetchMetrics,
    calculate: calculateMetrics,
  };
}
