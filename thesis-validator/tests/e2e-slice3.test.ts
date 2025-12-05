/**
 * End-to-End Tests for Slice 3 (Contradiction & Stress-Test)
 *
 * Tests the full flow of:
 * - Creating and managing contradictions
 * - Resolution workflow (explained/dismissed/critical)
 * - Contradiction statistics
 * - Integration with hypotheses
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../src/api/index.js';
import { getPool, runMigrations, closePool } from '../src/db/index.js';
import { randomUUID } from 'crypto';

describe('Slice 3: Contradiction & Stress-Test E2E Tests', () => {
  let server: FastifyInstance;
  let engagementId: string;

  // Track IDs for cleanup and cross-test references
  let hypothesisId: string;
  let contradictionId: string;

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
        'Slice 3 Test Company',
        'technology',
        'active',
        JSON.stringify({
          enable_real_time_support: true,
          enable_contradiction_analysis: true,
        }),
        JSON.stringify({ name: 'Slice 3 Test Company', sector: 'technology' }),
        'acquisition',
        'test-user',
      ]
    );

    // Create a test hypothesis to link contradictions to
    const { rows: hypothesisRows } = await pool.query(
      `INSERT INTO hypotheses (id, engagement_id, type, content, confidence, status, importance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        randomUUID(),
        engagementId,
        'thesis',
        'The company has strong competitive positioning in cloud infrastructure',
        0.75,
        'untested',
        'critical',
      ]
    );
    hypothesisId = hypothesisRows[0]!.id;

    // Create and start server
    server = await createServer({
      port: 3003,
      logLevel: 'error',
    });
    await server.listen({ port: 3003, host: '127.0.0.1' });
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    const pool = getPool();

    try {
      // Delete in proper order due to foreign keys
      await pool.query('DELETE FROM contradictions WHERE engagement_id = $1', [engagementId]);
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
  // CONTRADICTION CRUD
  // =====================

  describe('Contradiction CRUD Operations', () => {
    it('should create a contradiction manually', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId,
          description: 'Industry analysis suggests market share is declining due to new entrants',
          severity: 'medium',
          bearCaseTheme: 'Competitive pressure',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.contradiction).toBeDefined();
      expect(body.contradiction.description).toContain('market share is declining');
      expect(body.contradiction.severity).toBe('medium');
      expect(body.contradiction.status).toBe('unresolved');
      expect(body.contradiction.bearCaseTheme).toBe('Competitive pressure');

      contradictionId = body.contradiction.id;
    });

    it('should create additional contradictions with different severities', async () => {
      const contradictions = [
        {
          hypothesisId,
          description: 'Recent customer survey shows NPS declining year over year',
          severity: 'high',
          bearCaseTheme: 'Customer satisfaction risk',
        },
        {
          hypothesisId,
          description: 'Minor concerns about pricing pressure from competitors',
          severity: 'low',
        },
        {
          description: 'General market downturn may affect all players in segment',
          severity: 'medium',
          bearCaseTheme: 'Macro risk',
        },
      ];

      for (const c of contradictions) {
        const response = await server.inject({
          method: 'POST',
          url: `/api/v1/engagements/${engagementId}/contradictions`,
          headers: { 'Content-Type': 'application/json' },
          payload: c,
        });

        expect(response.statusCode).toBe(201);
      }
    });

    it('should retrieve all contradictions for engagement', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradictions).toBeDefined();
      expect(body.contradictions.length).toBeGreaterThanOrEqual(4);
      // Should be sorted by severity (high first)
      const severities = body.contradictions.map((c: { severity: string }) => c.severity);
      expect(severities[0]).toBe('high');
    });

    it('should filter contradictions by severity', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions?severity=high`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradictions.every((c: { severity: string }) => c.severity === 'high')).toBe(true);
      expect(body.contradictions.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter contradictions by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions?status=unresolved`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradictions.every((c: { status: string }) => c.status === 'unresolved')).toBe(true);
    });

    it('should filter contradictions by hypothesis', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions?hypothesis_id=${hypothesisId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradictions.every((c: { hypothesisId: string }) => c.hypothesisId === hypothesisId)).toBe(true);
    });

    it('should get a single contradiction by ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradiction.id).toBe(contradictionId);
      expect(body.contradiction.severity).toBe('medium');
    });

    it('should update contradiction description and severity', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          description: 'Updated: Industry analysis confirms significant market share decline',
          severity: 'high',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradiction.description).toContain('confirms significant');
      expect(body.contradiction.severity).toBe('high');
    });

    it('should return 404 for non-existent contradiction', async () => {
      const fakeId = randomUUID();
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/${fakeId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // =====================
  // RESOLUTION WORKFLOW
  // =====================

  describe('Contradiction Resolution Workflow', () => {
    let resolvableContradictionId: string;

    beforeAll(async () => {
      // Create a contradiction to resolve
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId,
          description: 'Contradiction that will be resolved during testing',
          severity: 'medium',
        },
      });

      const body = JSON.parse(response.payload);
      resolvableContradictionId = body.contradiction.id;
    });

    it('should resolve contradiction as explained', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions/${resolvableContradictionId}/resolve`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          status: 'explained',
          resolutionNotes: 'Upon further analysis, this was due to a temporary market condition that has since corrected.',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradiction.status).toBe('explained');
      expect(body.contradiction.resolutionNotes).toContain('temporary market condition');
      expect(body.contradiction.resolvedBy).toBeDefined();
      expect(body.message).toBe('Contradiction marked as explained');
    });

    it('should not allow resolving already resolved contradiction', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions/${resolvableContradictionId}/resolve`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          status: 'dismissed',
          resolutionNotes: 'Trying to resolve again',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Contradiction is already resolved');
    });

    it('should mark contradiction as critical', async () => {
      // Create another contradiction to mark as critical
      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId,
          description: 'Critical finding that requires immediate attention',
          severity: 'high',
        },
      });

      const { contradiction } = JSON.parse(createResponse.payload);

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradiction.id}/critical`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradiction.status).toBe('critical');
      expect(body.message).toBe('Contradiction marked as critical');
    });

    it('should resolve critical contradiction', async () => {
      // Get the critical contradiction
      const listResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions?status=critical`,
      });

      const { contradictions } = JSON.parse(listResponse.payload);
      const criticalContradiction = contradictions[0];

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions/${criticalContradiction.id}/resolve`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          status: 'dismissed',
          resolutionNotes: 'After investigation, determined this was based on outdated data.',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradiction.status).toBe('dismissed');
    });
  });

  // =====================
  // STATISTICS
  // =====================

  describe('Contradiction Statistics', () => {
    it('should get contradiction statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/stats`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stats).toBeDefined();
      expect(body.stats.totalCount).toBeGreaterThanOrEqual(4);
      expect(body.stats.bySeverity).toBeDefined();
      expect(body.stats.bySeverity.high).toBeGreaterThanOrEqual(1);
      expect(body.stats.bySeverity.medium).toBeGreaterThanOrEqual(1);
      expect(body.stats.byStatus).toBeDefined();
      expect(body.stats.resolutionRate).toBeGreaterThanOrEqual(0);
      expect(body.stats.resolutionRate).toBeLessThanOrEqual(1);
    });
  });

  // =====================
  // DELETE
  // =====================

  describe('Contradiction Deletion', () => {
    it('should delete contradiction', async () => {
      // Create contradiction to delete
      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          description: 'Contradiction to be deleted',
          severity: 'low',
        },
      });

      const { contradiction } = JSON.parse(createResponse.payload);

      // Delete it
      const deleteResponse = await server.inject({
        method: 'DELETE',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradiction.id}`,
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(JSON.parse(deleteResponse.payload).message).toBe('Contradiction deleted successfully');

      // Verify it's gone
      const getResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradiction.id}`,
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  // =====================
  // INTEGRATION
  // =====================

  describe('Hypothesis-Contradiction Integration', () => {
    it('should show contradictions linked to hypothesis', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions?hypothesis_id=${hypothesisId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.contradictions.length).toBeGreaterThanOrEqual(3);
      expect(body.contradictions.every((c: { hypothesisId: string }) => c.hypothesisId === hypothesisId)).toBe(true);
    });

    it('should preserve contradiction when hypothesis is deleted', async () => {
      // Create a new hypothesis
      const pool = getPool();
      const newHypothesisId = randomUUID();
      await pool.query(
        `INSERT INTO hypotheses (id, engagement_id, type, content, confidence, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newHypothesisId, engagementId, 'assumption', 'Test assumption for deletion', 0.5, 'untested']
      );

      // Create contradiction linked to it
      const createResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/engagements/${engagementId}/contradictions`,
        headers: { 'Content-Type': 'application/json' },
        payload: {
          hypothesisId: newHypothesisId,
          description: 'Contradiction linked to hypothesis that will be deleted',
          severity: 'low',
        },
      });

      const { contradiction } = JSON.parse(createResponse.payload);

      // Delete the hypothesis
      await server.inject({
        method: 'DELETE',
        url: `/api/v1/engagements/${engagementId}/hypotheses/${newHypothesisId}`,
      });

      // Verify contradiction still exists (with null hypothesis_id)
      const getResponse = await server.inject({
        method: 'GET',
        url: `/api/v1/engagements/${engagementId}/contradictions/${contradiction.id}`,
      });

      expect(getResponse.statusCode).toBe(200);
      const body = JSON.parse(getResponse.payload);
      expect(body.contradiction.hypothesisId).toBeNull();
    });
  });
});
