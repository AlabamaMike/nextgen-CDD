/**
 * Metrics Routes
 *
 * REST API endpoints for research quality metrics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  authHook,
  requireEngagementAccess,
} from '../middleware/index.js';
import { MetricsRepository, type MetricType } from '../../repositories/index.js';
import { getPool } from '../../db/index.js';

const metricsRepo = new MetricsRepository();

/**
 * Register metrics routes
 */
export async function registerMetricsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authHook);

  /**
   * Get current research quality metrics
   * GET /engagements/:engagementId/metrics
   */
  fastify.get(
    '/:engagementId/metrics',
    {
      preHandler: requireEngagementAccess('viewer'),
    },
    async (
      request: FastifyRequest<{ Params: { engagementId: string } }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;

      // Verify engagement exists
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id FROM engagements WHERE id = $1',
        [engagementId]
      );

      if (rows.length === 0) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      const metrics = await metricsRepo.getResearchQuality(engagementId);

      reply.send({
        engagementId,
        metrics,
      });
    }
  );

  /**
   * Calculate and record current metrics
   * POST /engagements/:engagementId/metrics/calculate
   */
  fastify.post(
    '/:engagementId/metrics/calculate',
    {
      preHandler: requireEngagementAccess('editor'),
    },
    async (
      request: FastifyRequest<{ Params: { engagementId: string } }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;

      // Verify engagement exists
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id FROM engagements WHERE id = $1',
        [engagementId]
      );

      if (rows.length === 0) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      const metrics = await metricsRepo.calculateAndRecordMetrics(engagementId);

      reply.status(201).send({
        message: 'Metrics calculated and recorded',
        engagementId,
        metrics,
      });
    }
  );

  /**
   * Get metric history
   * GET /engagements/:engagementId/metrics/history
   */
  fastify.get(
    '/:engagementId/metrics/history',
    {
      preHandler: requireEngagementAccess('viewer'),
      schema: {
        querystring: z.object({
          metric_type: z.enum([
            'evidence_credibility_avg',
            'source_diversity_score',
            'hypothesis_coverage',
            'contradiction_resolution_rate',
            'overall_confidence',
            'stress_test_vulnerability',
            'research_completeness',
          ]).optional(),
          limit: z.coerce.number().min(1).max(200).default(50),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Querystring: { metric_type?: MetricType; limit: number };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { metric_type, limit } = request.query;

      // Verify engagement exists
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id FROM engagements WHERE id = $1',
        [engagementId]
      );

      if (rows.length === 0) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      if (metric_type) {
        // Get history for specific metric type
        const history = await metricsRepo.getHistory(engagementId, metric_type, limit);
        reply.send({
          engagementId,
          metricType: metric_type,
          history,
        });
      } else {
        // Get all latest metrics
        const allLatest = await metricsRepo.getAllLatest(engagementId);
        reply.send({
          engagementId,
          latest: allLatest,
        });
      }
    }
  );

  /**
   * Record a metric manually
   * POST /engagements/:engagementId/metrics
   */
  fastify.post(
    '/:engagementId/metrics',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          metricType: z.enum([
            'evidence_credibility_avg',
            'source_diversity_score',
            'hypothesis_coverage',
            'contradiction_resolution_rate',
            'overall_confidence',
            'stress_test_vulnerability',
            'research_completeness',
          ]),
          value: z.number().min(0).max(1),
          metadata: z.record(z.unknown()).optional(),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Body: { metricType: MetricType; value: number; metadata?: Record<string, unknown> };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { metricType, value, metadata } = request.body;

      // Verify engagement exists
      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id FROM engagements WHERE id = $1',
        [engagementId]
      );

      if (rows.length === 0) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      const metric = await metricsRepo.record({
        engagementId,
        metricType,
        value,
        ...(metadata ? { metadata } : {}),
      });

      reply.status(201).send({
        message: 'Metric recorded',
        metric,
      });
    }
  );
}
