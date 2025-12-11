/**
 * TUI Integration Tests
 *
 * These tests verify end-to-end workflows through the API client.
 * They can run against a live backend (E2E_TEST=true) or use mocks for CI.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import axios from 'axios';
import { ThesisValidatorClient } from '../src/api/client.js';
import type {
  Engagement,
  HypothesisData,
  EvidenceData,
  ContradictionData,
  StressTestData,
} from '../src/types/api.js';

// Check if running E2E tests against live backend
const isE2E = process.env.E2E_TEST === 'true';
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

// Mock axios for unit test mode
vi.mock('axios');

// Helper to create mock axios instance
function createMockAxiosInstance() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  };
}

describe('TUI Integration Tests', () => {
  let client: ThesisValidatorClient;
  let mockAxios: ReturnType<typeof createMockAxiosInstance>;

  // Test data
  const testEngagement: Engagement = {
    id: 'eng-test-001',
    name: 'Test Acquisition',
    target: {
      name: 'TechCo Inc',
      sector: 'Software',
      region: 'North America',
    },
    deal_type: 'buyout',
    status: 'active',
    created_at: Date.now(),
    updated_at: Date.now(),
    created_by: 'test-user',
  };

  const testHypotheses: HypothesisData[] = [
    {
      id: 'hyp-001',
      engagement_id: testEngagement.id,
      type: 'root',
      statement: 'TechCo has a sustainable competitive advantage',
      confidence: 0.75,
      importance: 1.0,
      status: 'proposed',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'hyp-002',
      engagement_id: testEngagement.id,
      type: 'lever',
      statement: 'Strong customer retention metrics',
      confidence: 0.82,
      importance: 0.8,
      status: 'validated',
      parent_id: 'hyp-001',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  const testEvidence: EvidenceData[] = [
    {
      id: 'ev-001',
      engagement_id: testEngagement.id,
      source_type: 'web_search',
      source_name: 'Industry Report 2024',
      content: 'TechCo has shown 95% customer retention rate over 3 years',
      credibility: 0.85,
      sentiment: 'supportive',
      created_at: Date.now(),
    },
    {
      id: 'ev-002',
      engagement_id: testEngagement.id,
      source_type: 'analyst_note',
      source_name: 'Internal Analysis',
      content: 'Competitor analysis shows market pressure increasing',
      credibility: 0.9,
      sentiment: 'contradictory',
      created_at: Date.now(),
    },
  ];

  const testContradictions: ContradictionData[] = [
    {
      id: 'con-001',
      engagement_id: testEngagement.id,
      description: 'Customer retention claims conflict with market pressure analysis',
      severity: 'medium',
      status: 'unresolved',
      evidence_ids: ['ev-001', 'ev-002'],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  const testStressTest: StressTestData = {
    id: 'st-001',
    engagement_id: testEngagement.id,
    intensity: 'moderate',
    status: 'completed',
    scenarios_run: 5,
    vulnerabilities_found: 2,
    overall_risk_score: 0.35,
    started_at: Date.now() - 60000,
    completed_at: Date.now(),
    created_at: Date.now() - 60000,
    updated_at: Date.now(),
    results: {
      scenarios: [
        {
          name: 'Market Downturn',
          description: 'Economic recession impact',
          outcome: 'moderate_risk',
          impact_score: 0.4,
        },
      ],
      vulnerabilities: [
        {
          area: 'Customer Concentration',
          description: 'Top 3 customers represent 45% of revenue',
          severity: 'medium',
          mitigation: 'Diversification strategy recommended',
        },
      ],
      overall_assessment: 'moderate',
      recommendations: ['Diversify customer base', 'Build recession reserves'],
    },
  };

  beforeAll(() => {
    if (isE2E) {
      console.log(`Running E2E tests against ${TEST_SERVER_URL}`);
    }
  });

  beforeEach(() => {
    if (!isE2E) {
      mockAxios = createMockAxiosInstance();
      vi.mocked(axios.create).mockReturnValue(mockAxios as unknown as ReturnType<typeof axios.create>);
    }
    client = new ThesisValidatorClient(TEST_SERVER_URL);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Engagement Lifecycle', () => {
    it('should create, read, update, and delete an engagement', async () => {
      if (!isE2E) {
        // Mock responses for CRUD operations
        mockAxios.post.mockResolvedValueOnce({
          data: { engagement: testEngagement },
        });
        mockAxios.get.mockResolvedValueOnce({
          data: { engagement: testEngagement },
        });
        mockAxios.patch.mockResolvedValueOnce({
          data: { engagement: { ...testEngagement, name: 'Updated Name' } },
        });
        mockAxios.delete.mockResolvedValueOnce({ data: {} });
      }

      // Create
      const created = await client.createEngagement({
        name: testEngagement.name,
        target: testEngagement.target,
        deal_type: testEngagement.deal_type,
      });
      expect(created.name).toBe(testEngagement.name);

      // Read
      const fetched = await client.getEngagement(created.id);
      expect(fetched.id).toBe(created.id);

      // Update
      const updated = await client.updateEngagement(created.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');

      // Delete
      await client.deleteEngagement(created.id);

      if (!isE2E) {
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.patch).toHaveBeenCalledTimes(1);
        expect(mockAxios.delete).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Complete Research Workflow', () => {
    it('should submit thesis, start research, and retrieve results', async () => {
      if (!isE2E) {
        // Mock engagement creation
        mockAxios.post.mockResolvedValueOnce({
          data: { engagement: testEngagement },
        });

        // Mock thesis submission
        mockAxios.post.mockResolvedValueOnce({
          data: { message: 'Thesis submitted' },
        });

        // Mock research start
        mockAxios.post.mockResolvedValueOnce({
          data: { job_id: 'job-001', message: 'Research started' },
        });

        // Mock job status (completed)
        mockAxios.get.mockResolvedValueOnce({
          data: {
            job_id: 'job-001',
            engagement_id: testEngagement.id,
            type: 'research',
            status: 'completed',
            progress: 100,
            started_at: Date.now() - 30000,
            completed_at: Date.now(),
          },
        });

        // Mock hypotheses
        mockAxios.get.mockResolvedValueOnce({
          data: { hypotheses: testHypotheses, edges: [] },
        });

        // Mock evidence
        mockAxios.get.mockResolvedValueOnce({
          data: { evidence: testEvidence },
        });
      }

      // Create engagement
      const engagement = await client.createEngagement({
        name: 'Research Test Deal',
        target: { name: 'ResearchCo', sector: 'Technology' },
        deal_type: 'growth',
      });

      // Start research with thesis
      const { job_id } = await client.startResearch(
        engagement.id,
        'ResearchCo is a market leader with sustainable competitive advantages in enterprise software.'
      );
      expect(job_id).toBeDefined();

      // Wait for completion (poll in real scenario)
      const job = await client.getResearchJob(engagement.id, job_id);
      expect(job.status).toBe('completed');

      // Verify hypotheses were created
      const hypothesesResult = await client.getHypotheses(engagement.id);
      expect(hypothesesResult.hypotheses.length).toBeGreaterThan(0);

      // Verify evidence was gathered
      const evidence = await client.getEvidence(engagement.id);
      expect(evidence.length).toBeGreaterThan(0);

      if (!isE2E) {
        // Verify API call sequence
        expect(mockAxios.post).toHaveBeenCalledTimes(3); // create, thesis, research
        expect(mockAxios.get).toHaveBeenCalledTimes(3); // job, hypotheses, evidence
      }
    });

    it('should handle research job polling until completion', async () => {
      if (!isE2E) {
        // Mock a sequence of job status updates
        const jobStatuses = [
          { status: 'running', progress: 25 },
          { status: 'running', progress: 50 },
          { status: 'running', progress: 75 },
          { status: 'completed', progress: 100 },
        ];

        jobStatuses.forEach((status) => {
          mockAxios.get.mockResolvedValueOnce({
            data: {
              job_id: 'job-poll-001',
              engagement_id: testEngagement.id,
              type: 'research',
              ...status,
              started_at: Date.now() - 30000,
              completed_at: status.status === 'completed' ? Date.now() : undefined,
            },
          });
        });
      }

      // Simulate polling
      let attempts = 0;
      let status = 'running';

      while (status !== 'completed' && attempts < 10) {
        const job = await client.getResearchJob(testEngagement.id, 'job-poll-001');
        status = job.status;
        attempts++;

        if (!isE2E && status !== 'completed') {
          continue; // Keep polling in mock mode
        }
        if (status === 'completed') break;
      }

      expect(status).toBe('completed');
      expect(attempts).toBeLessThanOrEqual(4);
    });
  });

  describe('Stress Test Execution', () => {
    it('should execute stress test and retrieve results', async () => {
      if (!isE2E) {
        // Mock stress test start
        mockAxios.post.mockResolvedValueOnce({
          data: {
            stressTest: { ...testStressTest, status: 'running', results: null },
          },
        });

        // Mock stress test completion
        mockAxios.get.mockResolvedValueOnce({
          data: { stressTest: testStressTest },
        });

        // Mock contradictions
        mockAxios.get.mockResolvedValueOnce({
          data: { contradictions: testContradictions },
        });
      }

      // Start stress test
      const stressTest = await client.startStressTest(testEngagement.id, {
        intensity: 'moderate',
      });
      expect(stressTest.id).toBeDefined();

      // Wait for completion (mock immediate completion)
      const completedTest = await client.getStressTest(testEngagement.id, stressTest.id);
      expect(completedTest.status).toBe('completed');
      expect(completedTest.results).toBeDefined();
      expect(completedTest.results?.scenarios.length).toBeGreaterThan(0);

      // Verify contradictions were discovered
      const contradictions = await client.getContradictions(testEngagement.id);
      expect(contradictions.length).toBeGreaterThan(0);

      if (!isE2E) {
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle stress test with different intensities', async () => {
      const intensities = ['light', 'moderate', 'aggressive'] as const;

      for (const intensity of intensities) {
        if (!isE2E) {
          mockAxios.post.mockResolvedValueOnce({
            data: {
              stressTest: { ...testStressTest, intensity, id: `st-${intensity}` },
            },
          });
        }

        const test = await client.startStressTest(testEngagement.id, { intensity });
        expect(test.intensity).toBe(intensity);
      }

      if (!isE2E) {
        expect(mockAxios.post).toHaveBeenCalledTimes(3);
      }
    });
  });

  describe('Contradiction Resolution Workflow', () => {
    it('should list, resolve, and verify contradiction status', async () => {
      if (!isE2E) {
        // Mock contradictions list
        mockAxios.get.mockResolvedValueOnce({
          data: { contradictions: testContradictions },
        });

        // Mock resolve
        mockAxios.post.mockResolvedValueOnce({
          data: {
            contradiction: {
              ...testContradictions[0],
              status: 'explained',
              resolution_notes: 'Market pressure is short-term, retention trend is long-term',
              resolved_at: Date.now(),
              resolved_by: 'test-user',
            },
          },
        });

        // Mock stats
        mockAxios.get.mockResolvedValueOnce({
          data: {
            stats: {
              total: 1,
              by_severity: { low: 0, medium: 1, high: 0 },
              by_status: { explained: 1, dismissed: 0, unresolved: 0, critical: 0 },
              resolution_rate: 1.0,
            },
          },
        });
      }

      // Get unresolved contradictions
      const contradictions = await client.getContradictions(testEngagement.id);
      const unresolved = contradictions.filter((c) => c.status === 'unresolved');
      expect(unresolved.length).toBeGreaterThan(0);

      // Resolve a contradiction
      const firstContradiction = unresolved[0];
      if (firstContradiction) {
        const resolved = await client.resolveContradiction(
          testEngagement.id,
          firstContradiction.id,
          {
            status: 'explained',
            resolution_notes: 'Market pressure is short-term, retention trend is long-term',
          }
        );
        expect(resolved.status).toBe('explained');
      }

      // Verify stats updated
      const stats = await client.getContradictionStats(testEngagement.id);
      expect(stats.resolution_rate).toBeGreaterThan(0);
    });

    it('should mark contradiction as critical', async () => {
      if (!isE2E) {
        mockAxios.post.mockResolvedValueOnce({
          data: {
            contradiction: { ...testContradictions[0], status: 'critical' },
          },
        });
      }

      const critical = await client.markContradictionCritical(
        testEngagement.id,
        testContradictions[0]!.id
      );
      expect(critical.status).toBe('critical');
    });
  });

  describe('Hypothesis Management', () => {
    it('should create, update, and link hypotheses', async () => {
      if (!isE2E) {
        // Mock create hypothesis
        mockAxios.post.mockResolvedValueOnce({
          data: { hypothesis: testHypotheses[0] },
        });

        // Mock update
        mockAxios.patch.mockResolvedValueOnce({
          data: { hypothesis: { ...testHypotheses[0], confidence: 0.9 } },
        });

        // Mock edge creation
        mockAxios.post.mockResolvedValueOnce({
          data: {
            edge: {
              id: 'edge-001',
              source_id: testHypotheses[0]!.id,
              target_id: testHypotheses[1]!.id,
              edge_type: 'supports',
            },
          },
        });
      }

      // Create root hypothesis
      const hypothesis = await client.createHypothesis(testEngagement.id, {
        type: 'root',
        statement: 'Test hypothesis statement',
        confidence: 0.75,
        importance: 1.0,
      });
      expect(hypothesis.id).toBeDefined();

      // Update confidence
      const updated = await client.updateHypothesis(testEngagement.id, hypothesis.id, {
        confidence: 0.9,
      });
      expect(updated.confidence).toBe(0.9);

      // Create edge (requires second hypothesis)
      const edge = await client.createHypothesisEdge(testEngagement.id, hypothesis.id, {
        target_hypothesis_id: 'hyp-002',
        edge_type: 'supports',
      });
      expect(edge.edge_type).toBe('supports');
    });
  });

  describe('Evidence Collection', () => {
    it('should filter evidence by sentiment', async () => {
      if (!isE2E) {
        mockAxios.get.mockResolvedValueOnce({
          data: { evidence: testEvidence.filter((e) => e.sentiment === 'supportive') },
        });
      }

      const supportive = await client.getEvidence(testEngagement.id, {
        sentiment: 'supportive',
      });
      expect(supportive.every((e) => e.sentiment === 'supportive')).toBe(true);
    });

    it('should link evidence to hypothesis', async () => {
      if (!isE2E) {
        mockAxios.post.mockResolvedValueOnce({ data: {} });
      }

      await client.linkEvidenceToHypothesis(
        testEngagement.id,
        testEvidence[0]!.id,
        testHypotheses[0]!.id,
        0.85
      );

      if (!isE2E) {
        expect(mockAxios.post).toHaveBeenCalledWith(
          `/api/v1/engagements/${testEngagement.id}/evidence/${testEvidence[0]!.id}/hypotheses`,
          { hypothesisId: testHypotheses[0]!.id, relevanceScore: 0.85 }
        );
      }
    });
  });

  describe('Metrics Dashboard', () => {
    it('should retrieve and calculate metrics', async () => {
      const mockMetrics = {
        evidence_credibility_avg: 0.82,
        source_diversity_score: 0.75,
        hypothesis_coverage: 0.68,
        contradiction_resolution_rate: 0.5,
        overall_confidence: 72,
        stress_test_vulnerability: 0.35,
        research_completeness: 0.8,
        calculated_at: Date.now(),
      };

      if (!isE2E) {
        mockAxios.get.mockResolvedValueOnce({
          data: { metrics: mockMetrics },
        });

        mockAxios.post.mockResolvedValueOnce({
          data: { metrics: { ...mockMetrics, overall_confidence: 75 } },
        });
      }

      // Get current metrics
      const metrics = await client.getResearchMetrics(testEngagement.id);
      expect(metrics.evidence_credibility_avg).toBeDefined();
      expect(metrics.overall_confidence).toBeGreaterThan(0);

      // Recalculate
      const recalculated = await client.calculateMetrics(testEngagement.id);
      expect(recalculated).toBeDefined();
    });
  });

  describe('Skills Library', () => {
    it('should list and filter skills', async () => {
      const mockSkills = [
        {
          id: 'skill-001',
          name: 'market_sizing',
          description: 'Estimate market size',
          category: 'market_sizing',
          version: '1.0.0',
          parameters: [{ name: 'target_market', type: 'string', required: true }],
        },
        {
          id: 'skill-002',
          name: 'competitor_analysis',
          description: 'Analyze competitors',
          category: 'competitive',
          version: '1.0.0',
          parameters: [{ name: 'competitors', type: 'array', required: true }],
        },
      ];

      if (!isE2E) {
        mockAxios.get.mockResolvedValueOnce({
          data: { skills: mockSkills, total: 2, limit: 20, offset: 0 },
        });
      }

      const result = await client.getSkills();
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(result.skills.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      if (!isE2E) {
        mockAxios.get.mockRejectedValueOnce({
          response: {
            status: 404,
            data: { error: 'Not found', message: 'Engagement not found' },
          },
        });
      }

      await expect(client.getEngagement('non-existent-id')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      if (!isE2E) {
        mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      }

      await expect(client.getHealth()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      if (!isE2E) {
        mockAxios.get.mockRejectedValueOnce({
          code: 'ECONNABORTED',
          message: 'timeout of 30000ms exceeded',
        });
      }

      await expect(client.getEngagements()).rejects.toBeDefined();
    });
  });

  describe('Complete End-to-End Workflow', () => {
    it('should execute full due diligence workflow', async () => {
      if (!isE2E) {
        // Setup comprehensive mocks for full workflow
        // Create engagement
        mockAxios.post.mockResolvedValueOnce({
          data: { engagement: testEngagement },
        });
        // Submit thesis
        mockAxios.post.mockResolvedValueOnce({
          data: { message: 'Thesis submitted' },
        });
        // Start research
        mockAxios.post.mockResolvedValueOnce({
          data: { job_id: 'job-e2e-001', message: 'Research started' },
        });
        // Job status
        mockAxios.get.mockResolvedValueOnce({
          data: {
            job_id: 'job-e2e-001',
            engagement_id: testEngagement.id,
            type: 'research',
            status: 'completed',
            progress: 100,
            started_at: Date.now() - 30000,
            completed_at: Date.now(),
          },
        });
        // Hypotheses
        mockAxios.get.mockResolvedValueOnce({
          data: { hypotheses: testHypotheses, edges: [] },
        });
        // Evidence
        mockAxios.get.mockResolvedValueOnce({
          data: { evidence: testEvidence },
        });
        // Stress test start
        mockAxios.post.mockResolvedValueOnce({
          data: { stressTest: testStressTest },
        });
        // Stress test result
        mockAxios.get.mockResolvedValueOnce({
          data: { stressTest: testStressTest },
        });
        // Contradictions
        mockAxios.get.mockResolvedValueOnce({
          data: { contradictions: testContradictions },
        });
        // Metrics
        mockAxios.get.mockResolvedValueOnce({
          data: {
            metrics: {
              evidence_credibility_avg: 0.82,
              source_diversity_score: 0.75,
              hypothesis_coverage: 0.68,
              contradiction_resolution_rate: 0.5,
              overall_confidence: 72,
              stress_test_vulnerability: 0.35,
              research_completeness: 0.8,
              calculated_at: Date.now(),
            },
          },
        });
      }

      // Step 1: Create engagement
      const engagement = await client.createEngagement({
        name: 'Full E2E Test Deal',
        target: { name: 'E2E Corp', sector: 'Technology' },
        deal_type: 'buyout',
      });
      expect(engagement.id).toBeDefined();

      // Step 2: Submit thesis and start research
      const { job_id } = await client.startResearch(
        engagement.id,
        'E2E Corp represents a compelling acquisition target with strong market position.'
      );
      expect(job_id).toBeDefined();

      // Step 3: Wait for research completion
      const job = await client.getResearchJob(engagement.id, job_id);
      expect(job.status).toBe('completed');

      // Step 4: Verify hypotheses were created
      const hypothesesResult = await client.getHypotheses(engagement.id);
      expect(hypothesesResult.hypotheses.length).toBeGreaterThan(0);

      // Step 5: Verify evidence was gathered
      const evidence = await client.getEvidence(engagement.id);
      expect(evidence.length).toBeGreaterThan(0);

      // Step 6: Run stress test
      const stressTest = await client.startStressTest(engagement.id, { intensity: 'moderate' });
      expect(stressTest.id).toBeDefined();

      // Step 7: Get stress test results
      const testResult = await client.getStressTest(engagement.id, stressTest.id);
      expect(testResult.status).toBe('completed');

      // Step 8: Check for contradictions
      const contradictions = await client.getContradictions(engagement.id);
      expect(contradictions).toBeDefined();

      // Step 9: Get final metrics
      const metrics = await client.getResearchMetrics(engagement.id);
      expect(metrics.overall_confidence).toBeGreaterThan(0);

      // Verify the workflow completed successfully
      console.log('E2E Workflow Results:', {
        engagementId: engagement.id,
        hypothesesCount: hypothesesResult.hypotheses.length,
        evidenceCount: evidence.length,
        stressTestScore: testResult.overall_risk_score,
        contradictionsCount: contradictions.length,
        overallConfidence: metrics.overall_confidence,
      });
    });
  });
});
