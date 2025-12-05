/**
 * End-to-End Tests for Slice 1 (Hypothesis Management) and Slice 2 (Evidence Management)
 *
 * Tests the full flow of:
 * - Creating and managing hypotheses (tree structure)
 * - Creating and managing evidence
 * - Linking evidence to hypotheses
 * - Statistics aggregation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../src/api/index.js';
import { getPool, runMigrations, closePool } from '../src/db/index.js';
import { randomUUID } from 'crypto';

describe('Slice 1 & 2 E2E Tests', () => {
  let server: FastifyInstance;
  let engagementId: string;

  // Track IDs for cleanup and cross-test references
  let rootHypothesisId: string;
  let subHypothesisId: string;
  let evidenceId: string;

  beforeAll(async () => {
    // Set environment for test
    process.env['DISABLE_AUTH'] = 'true';
    process.env['NODE_ENV'] = 'test';

    const pool = getPool();

    // First, check if the correct schema exists
    // If not, we need to set it up properly for tests
    const { rows: columns } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'hypotheses' AND column_name = 'engagement_id'
    `);

    if (columns.length === 0) {
      // Old schema exists - drop and recreate for tests
      // This is safe because we're in a test environment
      console.log('[Test] Dropping old hypothesis tables to apply new schema...');
      await pool.query('DROP TABLE IF EXISTS hypothesis_edges CASCADE');
      await pool.query('DROP TABLE IF EXISTS hypotheses CASCADE');
      await pool.query('DROP TABLE IF EXISTS evidence_hypotheses CASCADE');
      await pool.query('DROP TABLE IF EXISTS evidence CASCADE');
      await pool.query('DROP TABLE IF EXISTS documents CASCADE');
    }

    // Run migrations to ensure schema is up to date
    await runMigrations();

    // Create test engagement in database
    engagementId = randomUUID();

    // Insert engagement with all required columns (both old and new schema columns)
    await pool.query(
      `INSERT INTO engagements (id, target_company, sector, status, config, target, deal_type, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        engagementId,
        'E2E Test Company',
        'technology',
        'active',
        JSON.stringify({
          enable_real_time_support: true,
          enable_contradiction_analysis: true,
          enable_comparables_search: true,
          auto_refresh_market_intel: false,
        }),
        JSON.stringify({ name: 'E2E Test Company', sector: 'technology' }), // target (legacy)
        'acquisition', // deal_type (legacy)
        'test-user', // created_by (legacy)
      ]
    );

    // Create and start server
    server = await createServer({
      port: 3002,
      logLevel: 'error',
    });
    await server.listen({ port: 3002, host: '127.0.0.1' });
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    const pool = getPool();

    try {
      // Delete in proper order due to foreign keys
      await pool.query('DELETE FROM evidence_hypotheses WHERE evidence_id IN (SELECT id FROM evidence WHERE engagement_id = $1)', [engagementId]);
      await pool.query('DELETE FROM evidence WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM hypothesis_edges WHERE source_id IN (SELECT id FROM hypotheses WHERE engagement_id = $1)', [engagementId]);
      await pool.query('DELETE FROM hypotheses WHERE engagement_id = $1', [engagementId]);
      await pool.query('DELETE FROM engagements WHERE id = $1', [engagementId]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Stop server
    if (server) {
      await server.close();
    }
    await closePool();
  }, 30000);

  // =====================
  // SLICE 1: HYPOTHESES
  // =====================

  describe('Slice 1: Hypothesis Management', () => {
    it('should create a root hypothesis (thesis)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          type: 'thesis',
          content: 'The target company has strong market positioning in the enterprise SaaS segment',
          confidence: 0.7,
          importance: 'critical',
          testability: 'moderate',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.hypothesis).toBeDefined();
      expect(body.hypothesis.type).toBe('thesis');
      expect(body.hypothesis.content).toContain('strong market positioning');
      expect(body.hypothesis.confidence).toBe(0.7);
      expect(body.hypothesis.status).toBe('untested');

      rootHypothesisId = body.hypothesis.id;
    });

    it('should create a sub-hypothesis linked to root', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          type: 'sub_thesis',
          content: 'Customer retention rate exceeds 90%',
          parent_id: rootHypothesisId,
          confidence: 0.5,
          importance: 'high',
          testability: 'easy',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.hypothesis.type).toBe('sub_thesis');
      expect(body.hypothesis.parentId).toBe(rootHypothesisId);

      subHypothesisId = body.hypothesis.id;
    });

    it('should create an assumption hypothesis', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          type: 'assumption',
          content: 'The market will continue to grow at 15% CAGR',
          parent_id: subHypothesisId,
          confidence: 0.4,
          importance: 'medium',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.hypothesis.type).toBe('assumption');
    });

    it('should retrieve the hypothesis tree', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.hypotheses).toBeDefined();
      expect(body.hypotheses.length).toBeGreaterThanOrEqual(3);
      expect(body.edges).toBeDefined();
      expect(body.count).toBe(body.hypotheses.length);

      // Verify tree structure
      const rootHypothesis = body.hypotheses.find((h: any) => h.id === rootHypothesisId);
      expect(rootHypothesis).toBeDefined();
      expect(rootHypothesis.type).toBe('thesis');
    });

    it('should get a single hypothesis by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${rootHypothesisId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.hypothesis.id).toBe(rootHypothesisId);
      expect(body.hypothesis.content).toContain('strong market positioning');
    });

    it('should update hypothesis status and confidence', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${subHypothesisId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          status: 'supported',
          confidence: 0.85,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.hypothesis.status).toBe('supported');
      expect(body.hypothesis.confidence).toBe(0.85);
    });

    it('should create a causal edge between hypotheses', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${rootHypothesisId}/edges`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          target_id: subHypothesisId,
          relationship: 'supports',
          strength: 0.8,
          reasoning: 'High retention supports market positioning thesis',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.edge).toBeDefined();
      expect(body.edge.sourceId).toBe(rootHypothesisId);
      expect(body.edge.targetId).toBe(subHypothesisId);
      expect(body.edge.relationship).toBe('supports');
    });

    it('should return 404 for non-existent hypothesis', async () => {
      const fakeId = randomUUID();
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =====================
  // SLICE 2: EVIDENCE
  // =====================

  describe('Slice 2: Evidence Management', () => {
    it('should create evidence for the engagement', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/${engagementId}/evidence`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          content: 'Company reported 95% customer retention in their latest annual report',
          sourceType: 'document',
          sentiment: 'supporting',
          credibility: 0.9,
          sourceTitle: 'Annual Report 2024',
          sourceUrl: 'https://example.com/annual-report-2024.pdf',
          sourceAuthor: 'Company IR Team',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.evidence).toBeDefined();
      expect(body.evidence.content).toContain('95% customer retention');
      expect(body.evidence.sourceType).toBe('document');
      expect(body.evidence.sentiment).toBe('supporting');
      expect(body.evidence.credibility).toBe(0.9);

      evidenceId = body.evidence.id;
    });

    it('should create additional evidence with different sentiment', async () => {
      const evidenceItems = [
        {
          content: 'Industry analyst notes competition increasing in enterprise segment',
          sourceType: 'expert',
          sentiment: 'contradicting',
          credibility: 0.7,
          sourceTitle: 'Analyst Interview Notes',
          sourceAuthor: 'John Smith, Gartner',
        },
        {
          content: 'Customer survey shows NPS of 72, above industry average',
          sourceType: 'data',
          sentiment: 'supporting',
          credibility: 0.85,
          sourceTitle: 'Q3 Customer Survey',
        },
        {
          content: 'Market research indicates total addressable market is $50B',
          sourceType: 'web',
          sentiment: 'neutral',
          credibility: 0.6,
          sourceUrl: 'https://example.com/market-research',
        },
      ];

      for (const evidence of evidenceItems) {
        const response = await server.inject({
          method: 'POST',
          url: `/api/v1/${engagementId}/evidence`,
          headers: { 'Content-Type': 'application/json' },
          payload: evidence,
        });

        expect(response.statusCode).toBe(201);
      }
    });

    it('should retrieve all evidence for engagement', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence).toBeDefined();
      expect(body.evidence.length).toBeGreaterThanOrEqual(4);
      expect(body.total).toBe(body.evidence.length);
    });

    it('should filter evidence by sentiment', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence?sentiment=supporting`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence.every((e: any) => e.sentiment === 'supporting')).toBe(true);
      expect(body.evidence.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter evidence by source type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence?source_type=document`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence.every((e: any) => e.sourceType === 'document')).toBe(true);
    });

    it('should filter evidence by minimum credibility', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence?min_credibility=0.8`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence.every((e: any) => e.credibility >= 0.8)).toBe(true);
    });

    it('should get evidence statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence/stats`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stats).toBeDefined();
      expect(body.stats.totalCount).toBeGreaterThanOrEqual(4);
      expect(body.stats.bySentiment).toBeDefined();
      expect(body.stats.bySentiment.supporting).toBeGreaterThanOrEqual(2);
      expect(body.stats.bySentiment.contradicting).toBeGreaterThanOrEqual(1);
      expect(body.stats.bySourceType).toBeDefined();
      expect(body.stats.averageCredibility).toBeGreaterThan(0);
    });

    it('should update evidence sentiment and credibility', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/${engagementId}/evidence/${evidenceId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          sentiment: 'neutral',
          credibility: 0.75,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence.sentiment).toBe('neutral');
      expect(body.evidence.credibility).toBe(0.75);
    });

    it('should link evidence to hypothesis', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/${engagementId}/evidence/${evidenceId}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId: subHypothesisId,
          relevanceScore: 0.9,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Evidence linked to hypothesis');
    });

    it('should filter evidence by hypothesis', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence?hypothesis_id=${subHypothesisId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.evidence.length).toBeGreaterThanOrEqual(1);
      expect(body.evidence.some((e: any) => e.id === evidenceId)).toBe(true);
    });

    it('should return 404 for non-existent evidence', async () => {
      const fakeId = randomUUID();
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/${engagementId}/evidence/${fakeId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: { sentiment: 'neutral' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should delete evidence', async () => {
      // Create evidence to delete
      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/${engagementId}/evidence`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          content: 'Evidence to be deleted',
          sourceType: 'web',
          sentiment: 'neutral',
        },
      });

      const { evidence } = JSON.parse(createResponse.payload);

      // Delete it
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: `/api/v1/${engagementId}/evidence/${evidence.id}`,
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(JSON.parse(deleteResponse.payload).message).toBe('Evidence deleted successfully');

      // Verify it's gone
      const getResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence`,
      });

      const body = JSON.parse(getResponse.payload);
      expect(body.evidence.find((e: any) => e.id === evidence.id)).toBeUndefined();
    });
  });

  // =====================
  // INTEGRATION TESTS
  // =====================

  describe('Slice 1 & 2 Integration', () => {
    it('should show updated hypothesis coverage in evidence stats after linking', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence/stats`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stats.hypothesisCoverage).toBeGreaterThan(0);
    });

    it('should properly delete hypothesis with linked evidence', async () => {
      // First, get current state
      const beforeResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
      });
      const beforeBody = JSON.parse(beforeResponse.payload);
      const initialCount = beforeBody.hypotheses.length;

      // Create a new hypothesis
      const createHypResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          type: 'assumption',
          content: 'Test hypothesis for deletion',
          confidence: 0.5,
        },
      });

      const { hypothesis } = JSON.parse(createHypResponse.payload);

      // Create evidence linked to it
      const createEvResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/${engagementId}/evidence`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          content: 'Evidence linked to test hypothesis',
          sourceType: 'data',
          sentiment: 'neutral',
        },
      });

      const { evidence: newEvidence } = JSON.parse(createEvResponse.payload);

      // Link them
      await server.inject({
        method: 'POST',
        url: `/api/v1/${engagementId}/evidence/${newEvidence.id}/hypotheses`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId: hypothesis.id,
          relevanceScore: 0.8,
        },
      });

      // Delete the hypothesis
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${hypothesis.id}`,
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify hypothesis is gone
      const afterResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/hypotheses`,
      });
      const afterBody = JSON.parse(afterResponse.payload);
      expect(afterBody.hypotheses.length).toBe(initialCount);

      // Evidence should still exist (orphaned, but not deleted)
      const evidenceResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/${engagementId}/evidence`,
      });
      const evidenceBody = JSON.parse(evidenceResponse.payload);
      expect(evidenceBody.evidence.find((e: any) => e.id === newEvidence.id)).toBeDefined();
    });
  });
});
