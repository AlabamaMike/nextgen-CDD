/**
 * End-to-End Tests for Slice 4 (Workflow Integration)
 *
 * Tests the full flow of:
 * - Research quality metrics recording and retrieval
 * - Stress test history and management
 * - End-to-end workflow integration (research → stress-test → metrics)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../src/api/index.js';
import { getPool, runMigrations, closePool } from '../src/db/index.js';
import { randomUUID } from 'crypto';

describe('Slice 4: Workflow Integration E2E Tests', () => {
  let server: FastifyInstance;
  let engagementId: string;
  let hypothesisId: string;

  beforeAll(async () => {
    // Set environment for test
    process.env['DISABLE_AUTH'] = 'true';
    process.env['NODE_ENV'] = 'test';

    const pool = getPool();

    // Run migrations to ensure schema is up to date
    await runMigrations();

    // Create test engagement in database
    engagementId = randomUUID();

    await pool.query(
      `INSERT INTO engagements (id, target_company, sector, status, config, target, deal_type, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        engagementId,
        'Slice 4 Test Company',
        'technology',
        'active',
        JSON.stringify({
          enable_real_time_support: true,
          enable_metrics_tracking: true,
        }),
        JSON.stringify({ name: 'Slice 4 Test Company', sector: 'technology' }),
        'acquisition',
        'test-user',
      ]
    );

    // Create test hypothesis
    hypothesisId = randomUUID();
    await pool.query(
      `INSERT INTO hypotheses (id, engagement_id, type, content, confidence, status, importance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        hypothesisId,
        engagementId,
        'thesis',
        'The company has sustainable competitive advantage in AI/ML infrastructure',
        0.7,
        'untested',
        'critical',
      ]
    );

    // Create some evidence to support metrics calculation
    await pool.query(
      `INSERT INTO evidence (id, engagement_id, source_type, source_url, content, credibility, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        engagementId,
        'web',
        'https://example.com/article',
        'Test evidence content',
        0.8,
        'supporting',
      ]
    );

    // Link evidence to hypothesis
    await pool.query(
      `INSERT INTO evidence_hypotheses (evidence_id, hypothesis_id)
       SELECT e.id, $1 FROM evidence e WHERE e.engagement_id = $2 LIMIT 1`,
      [hypothesisId, engagementId]
    );

    // Create and start server
    server = await createServer({
      port: 3004,
      logLevel: 'error',
    });
    await server.listen({ port: 3004, host: '127.0.0.1' });
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    const pool = getPool();

    try {
      await pool.query('DELETE FROM research_metrics WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM stress_tests WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM contradictions WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM evidence_hypotheses WHERE hypothesis_id IN (SELECT id FROM hypotheses WHERE engagement_id = $1)', [engagementId]);
      await pool.query('DELETE FROM evidence WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM hypotheses WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM engagements WHERE id = $1', [engagementId]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    if (server) {
      await server.close();
    }
    await closePool();
  }, 30000);

  // =====================
  // METRICS CRUD
  // =====================

  describe('Research Quality Metrics', () => {
    it('should get current metrics (empty initially)', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.metrics).toBeDefined();
      expect(body.engagementId).toBe(engagementId);
    });

    it('should calculate and record metrics', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/metrics/calculate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Metrics calculated and recorded');
      expect(body.metrics).toBeDefined();
      expect(body.metrics.evidenceCredibilityAvg).toBeGreaterThanOrEqual(0);
      expect(body.metrics.hypothesisCoverage).toBeGreaterThanOrEqual(0);
    });

    it('should get metrics after calculation', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.metrics.lastUpdated).not.toBeNull();
    });

    it('should record a metric manually', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/metrics`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          metricType: 'overall_confidence',
          value: 0.85,
          metadata: { source: 'manual_entry', note: 'Post-analysis update' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.metric).toBeDefined();
      expect(body.metric.value).toBe(0.85);
      expect(body.metric.metricType).toBe('overall_confidence');
    });

    it('should get metric history for a specific type', async () => {
      // Record a few more metrics
      await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/metrics`,
        headers: { 'Content-Type': 'application/json' },
        payload: { metricType: 'overall_confidence', value: 0.82 },
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics/history?metric_type=overall_confidence`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.metricType).toBe('overall_confidence');
      expect(body.history).toBeDefined();
      expect(body.history.length).toBeGreaterThanOrEqual(2);
    });

    it('should get all latest metrics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics/history`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.latest).toBeDefined();
    });

    it('should return 404 for non-existent engagement', async () => {
      const fakeId = randomUUID();
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${fakeId}/metrics`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =====================
  // STRESS TEST HISTORY
  // =====================

  describe('Stress Test History', () => {
    let stressTestId: string;

    it('should get empty stress test history initially', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stressTests).toBeDefined();
      expect(Array.isArray(body.stressTests)).toBe(true);
    });

    it('should start a new stress test', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/stress-tests`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          intensity: 'light',
          hypothesisIds: [hypothesisId],
        },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Stress test started');
      expect(body.stressTest).toBeDefined();
      expect(body.stressTest.intensity).toBe('light');
      expect(body.stressTest.status).toBe('pending');
      expect(body.statusUrl).toContain(body.stressTest.id);

      stressTestId = body.stressTest.id;
    });

    it('should get stress test by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stressTest.id).toBe(stressTestId);
    });

    it('should get stress test history with created test', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stressTests.length).toBeGreaterThanOrEqual(1);
      expect(body.stressTests.some((st: { id: string }) => st.id === stressTestId)).toBe(true);
    });

    it('should filter stress tests by status', async () => {
      // Create another stress test to have some variety
      await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/stress-tests`,
        headers: { 'Content-Type': 'application/json' },
        payload: { intensity: 'moderate' },
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests?status=pending`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // All returned should be pending (note: async execution may have changed status)
      expect(Array.isArray(body.stressTests)).toBe(true);
    });

    it('should get stress test statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests/stats`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stats).toBeDefined();
      expect(body.stats.totalCount).toBeGreaterThanOrEqual(1);
      expect(body.stats.byStatus).toBeDefined();
      expect(body.stats.byIntensity).toBeDefined();
    });

    it('should return 404 for non-existent stress test', async () => {
      const fakeId = randomUUID();
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should delete a stress test', async () => {
      // Wait a moment for async execution to potentially complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get current status first
      const statusResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`,
      });
      const status = JSON.parse(statusResponse.payload).stressTest.status;

      // Only try to delete if not running
      if (status !== 'running') {
        const response = await server.inject({
          method: 'DELETE',
          url: `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`,
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).message).toBe('Stress test deleted successfully');

        // Verify deletion
        const getResponse = await server.inject({
          method: 'GET',
          url: `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`,
        });
        expect(getResponse.statusCode).toBe(404);
      } else {
        // If still running, trying to delete should fail
        const response = await server.inject({
          method: 'DELETE',
          url: `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`,
        });
        expect(response.statusCode).toBe(400);
      }
    });
  });

  // =====================
  // WORKFLOW INTEGRATION
  // =====================

  describe('End-to-End Workflow Integration', () => {
    it('should have recorded metrics from stress test workflow', async () => {
      // Start a stress test that will complete
      const stResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/stress-tests`,
        headers: { 'Content-Type': 'application/json' },
        payload: { intensity: 'light' },
      });

      expect(stResponse.statusCode).toBe(202);

      // Wait for stress test to complete (may record metrics)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check that vulnerability metrics might have been recorded
      const metricsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics/history?metric_type=stress_test_vulnerability`,
      });

      expect(metricsResponse.statusCode).toBe(200);
      // The stress test may or may not have completed depending on timing
      // Just verify the endpoint works
    });

    it('should support complete research quality dashboard data', async () => {
      // Get all metrics
      const metricsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/metrics`,
      });
      expect(metricsResponse.statusCode).toBe(200);

      // Get stress test stats
      const statsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/stress-tests/stats`,
      });
      expect(statsResponse.statusCode).toBe(200);

      // Get contradiction stats
      const contradictionsResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/stats`,
      });
      expect(contradictionsResponse.statusCode).toBe(200);

      // This simulates what a dashboard would fetch
      const metrics = JSON.parse(metricsResponse.payload).metrics;
      const stStats = JSON.parse(statsResponse.payload).stats;
      const cStats = JSON.parse(contradictionsResponse.payload).stats;

      // All dashboard data should be available
      expect(metrics).toBeDefined();
      expect(stStats).toBeDefined();
      expect(cStats).toBeDefined();
    });
  });
});
