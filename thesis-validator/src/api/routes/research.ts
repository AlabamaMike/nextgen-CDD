/**
 * Research Routes
 *
 * REST API endpoints for research workflows, hypothesis management, and reports
 */

import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  authHook,
  requireEngagementAccess,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import { getEngagement, updateEngagement } from './engagements.js';
import {
  executeStressTestWorkflow,
} from '../../workflows/index.js';
import { createDealMemory } from '../../memory/index.js';
import type { HypothesisTree, HypothesisNode } from '../../models/index.js';
import { getPool } from '../../db/index.js';
import { getResearchQueue } from '../../services/job-queue.js';

/**
 * Research job status tracking
 */
interface ResearchJob {
  id: string;
  engagementId: string;
  type: 'research' | 'stress_test';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
  result?: unknown;
}

const jobStore = new Map<string, ResearchJob>();

/**
 * Register research routes
 */
export async function registerResearchRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authHook);

  /**
   * Trigger research workflow
   * POST /engagements/:engagementId/research
   */
  fastify.post(
    '/:engagementId/research',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          thesis: z.string().min(10, 'Thesis must be at least 10 characters').optional(),
          depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
          focus_areas: z.array(z.string()).optional(),
          include_comparables: z.boolean().default(true),
          max_sources: z.number().min(1).max(100).default(20),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Body: {
          thesis?: string;
          depth: 'quick' | 'standard' | 'deep';
          focus_areas?: string[];
          include_comparables: boolean;
          max_sources: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { thesis: requestThesis, ...config } = request.body;

      const engagement = await getEngagement(engagementId);
      if (!engagement) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      // Use thesis from request body if provided, otherwise use stored thesis
      const thesisSummary = requestThesis?.trim() || engagement.investment_thesis?.summary;
      if (!thesisSummary) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Investment thesis must be submitted before starting research',
        });
        return;
      }

      if (thesisSummary.length < 10) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Thesis must be at least 10 characters',
        });
        return;
      }

      // Update engagement with thesis if provided in request
      if (requestThesis?.trim()) {
        engagement.investment_thesis = {
          summary: requestThesis.trim(),
          key_value_drivers: [],
          key_risks: [],
        };
        void updateEngagement(engagementId, { investment_thesis: engagement.investment_thesis });
      }

      // Create job
      const jobId = crypto.randomUUID();
      const pool = getPool();

      // insert into DB
      await pool.query(
        `INSERT INTO research_jobs (id, engagement_id, type, status, config, progress)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          jobId,
          engagementId,
          'research',
          'queued',
          JSON.stringify(config),
          0
        ]
      );

      // Add to Queue
      const queue = getResearchQueue();
      await queue.addJob(jobId, {
        engagementId,
        thesis: engagement.investment_thesis?.summary || '',
        config: {
          maxHypotheses: config.max_sources > 20 ? 10 : 5,
          enableDeepDive: config.depth === 'deep',
          searchDepth: config.depth === 'quick' ? 'quick' : config.depth === 'deep' ? 'thorough' : 'standard',
          confidenceThreshold: 70
        }
      });

      // Update engagement status (use 'active' as the closest valid status)
      void updateEngagement(engagementId, { status: 'active' });

      reply.status(202).send({
        job_id: jobId,
        message: 'Research workflow started',
        status_url: `/api/v1/engagements/${engagementId}/research/${jobId}`,
      });
    }
  );

  /**
   * Get hypothesis tree
   * GET /engagements/:engagementId/hypothesis-tree
   */
  fastify.get(
    '/:engagementId/hypothesis-tree',
    {
      preHandler: requireEngagementAccess('viewer'),
    },
    async (
      request: FastifyRequest<{ Params: { engagementId: string } }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;

      const engagement = await getEngagement(engagementId);
      if (!engagement) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      const dealMemory = await createDealMemory(engagementId);
      const hypotheses = await dealMemory.getAllHypotheses();

      // Build tree structure
      const tree = buildHypothesisTree(engagementId, hypotheses);

      reply.send({
        engagement_id: engagementId,
        thesis: engagement.investment_thesis?.summary,
        tree,
        node_count: hypotheses.length,
      });
    }
  );

  // NOTE: Hypothesis CRUD routes moved to hypotheses.ts (Slice 1)
  // The route GET /engagements/:engagementId/hypotheses/:hypothesisId
  // is now handled by the dedicated hypotheses routes module

  /**
   * Execute stress test workflow
   * POST /engagements/:engagementId/stress-test
   */
  fastify.post(
    '/:engagementId/stress-test',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          hypothesis_ids: z.array(z.string().uuid()).optional(),
          intensity: z.enum(['light', 'moderate', 'aggressive']).default('moderate'),
          devil_advocate_mode: z.boolean().default(true),
          search_contrarian_sources: z.boolean().default(true),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Body: {
          hypothesis_ids?: string[];
          intensity: 'light' | 'moderate' | 'aggressive';
          devil_advocate_mode: boolean;
          search_contrarian_sources: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const user = (request as AuthenticatedRequest).user;
      const { engagementId } = request.params;
      const config = request.body;

      const engagement = await getEngagement(engagementId);
      if (!engagement) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      // Create job
      const jobId = crypto.randomUUID();
      const job: ResearchJob = {
        id: jobId,
        engagementId,
        type: 'stress_test',
        status: 'pending',
        progress: 0,
        startedAt: Date.now(),
      };
      jobStore.set(jobId, job);

      // Start stress test workflow asynchronously
      executeStressTestAsync(job, engagement, config, user.id);

      reply.status(202).send({
        job_id: jobId,
        message: 'Stress test workflow started',
        status_url: `/research/jobs/${jobId}`,
      });
    }
  );

  /**
   * Get research job status
   * GET /engagements/:engagementId/research/:jobId
   */
  fastify.get(
    '/:engagementId/research/:jobId',
    async (
      request: FastifyRequest<{ Params: { engagementId: string; jobId: string } }>,
      reply: FastifyReply
    ) => {
      // engagementId is available in params but currently unused as jobId is unique
      const { jobId } = request.params;

      // Check in-memory store first (for stress tests / legacy)
      const job = jobStore.get(jobId);

      if (job) {
        reply.send({
          job_id: job.id,
          engagement_id: job.engagementId,
          type: job.type,
          status: job.status,
          progress: job.progress,
          started_at: job.startedAt,
          completed_at: job.completedAt,
          error: job.error,
          result: job.status === 'completed' ? job.result : undefined,
        });
        return;
      }

      // Check DB (for research jobs)
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM research_jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Job not found',
        });
        return;
      }

      const dbJob = result.rows[0];

      // Try to get live progress from queue if active
      let progress = dbJob.progress;
      if (dbJob.status === 'queued' || dbJob.status === 'running') {
        try {
          const queue = getResearchQueue();
          const queueJob = await queue.getQueue().getJob(jobId);
          if (queueJob) {
            const queueProgress = queueJob.progress;
            if (typeof queueProgress === 'number') {
              progress = queueProgress;
            }
          }
        } catch (e) {
          // Ignore queue errors
        }
      }

      reply.send({
        job_id: dbJob.id,
        engagement_id: dbJob.engagement_id,
        type: dbJob.type,
        status: dbJob.status,
        progress: progress,
        started_at: dbJob.started_at,
        completed_at: dbJob.completed_at,
        error: dbJob.error_message,
        result: dbJob.results,
      });
    }
  );

  /**
   * Generate research report
   * GET /engagements/:engagementId/report
   */
  fastify.get(
    '/:engagementId/report',
    {
      preHandler: requireEngagementAccess('viewer'),
      schema: {
        querystring: z.object({
          format: z.enum(['json', 'markdown', 'html']).default('json'),
          include_evidence: z.coerce.boolean().default(true),
          include_contradictions: z.coerce.boolean().default(true),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Querystring: {
          format: 'json' | 'markdown' | 'html';
          include_evidence: boolean;
          include_contradictions: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { format } = request.query;

      const engagement = await getEngagement(engagementId);
      if (!engagement) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Engagement not found',
        });
        return;
      }

      const dealMemory = await createDealMemory(engagementId);

      // Gather all data
      const hypotheses = await dealMemory.getAllHypotheses();
      const stats = await dealMemory.getStats();

      // Count contradictions from hypotheses (approximation - contradictions affect evidence count)
      // Note: DealMemory doesn't track contradiction_count separately, use 0 as placeholder
      const contradictionCount = 0;

      // Generate report based on format
      const report = generateReport(
        engagement,
        hypotheses,
        stats.evidence_count,
        contradictionCount,
        format
      );

      if (format === 'markdown') {
        reply.header('Content-Type', 'text/markdown');
      } else if (format === 'html') {
        reply.header('Content-Type', 'text/html');
      }

      reply.send(report);
    }
  );
}



/**
 * Execute stress test workflow asynchronously
 */
async function executeStressTestAsync(
  job: ResearchJob,
  engagement: NonNullable<Awaited<ReturnType<typeof getEngagement>>>,
  config: {
    hypothesis_ids?: string[];
    intensity: 'light' | 'moderate' | 'aggressive';
    devil_advocate_mode: boolean;
    search_contrarian_sources: boolean;
  },
  _userId: string
): Promise<void> {
  job.status = 'running';

  try {
    const stressTestInput: Parameters<typeof executeStressTestWorkflow>[0] = {
      engagementId: engagement.id,
      config: {
        intensity: config.intensity,
      },
    };
    // Only include hypothesisIds if defined (to satisfy exactOptionalPropertyTypes)
    if (config.hypothesis_ids) {
      stressTestInput.hypothesisIds = config.hypothesis_ids;
    }
    const result = await executeStressTestWorkflow(stressTestInput);

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = Date.now();
    job.result = result;
  } catch (error) {
    job.status = 'failed';
    job.completedAt = Date.now();
    job.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Build hypothesis tree from flat list
 */
function buildHypothesisTree(
  engagementId: string,
  hypotheses: HypothesisNode[]
): HypothesisTree {
  // Find the root thesis node (first 'thesis' type node)
  const rootNode = hypotheses.find((h) => h.type === 'thesis');
  const rootThesisId = rootNode?.id ?? crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    engagement_id: engagementId,
    root_thesis_id: rootThesisId,
    nodes: hypotheses,
    edges: [], // Would be populated from causal graph
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

/**
 * Generate report in specified format
 */
function generateReport(
  engagement: NonNullable<Awaited<ReturnType<typeof getEngagement>>>,
  hypotheses: HypothesisNode[],
  evidenceCount: number,
  contradictionCount: number,
  format: 'json' | 'markdown' | 'html'
): string | object {
  // Build engagement object for report (handle optional thesis)
  const engagementData: ReportData['engagement'] = {
    id: engagement.id,
    name: engagement.name,
    target: {
      name: engagement.target_company.name,
      sector: engagement.target_company.sector,
    },
    status: engagement.status,
  };
  if (engagement.investment_thesis) {
    engagementData.thesis = { summary: engagement.investment_thesis.summary };
  }

  const reportData: ReportData = {
    engagement: engagementData,
    summary: {
      hypothesis_count: hypotheses.length,
      evidence_count: evidenceCount,
      contradiction_count: contradictionCount,
      overall_confidence: calculateOverallConfidence(hypotheses),
    },
    hypotheses: hypotheses.map((h) => ({
      id: h.id,
      content: h.content,
      type: h.type,
      status: h.status,
      confidence: h.confidence,
    })),
    generated_at: Date.now(),
  };

  if (format === 'json') {
    return reportData;
  }

  if (format === 'markdown') {
    return generateMarkdownReport(reportData);
  }

  return generateHtmlReport(reportData);
}

/**
 * Calculate overall confidence from hypotheses
 */
function calculateOverallConfidence(hypotheses: HypothesisNode[]): number {
  if (hypotheses.length === 0) return 0;

  const confidences = hypotheses.map((h) => h.confidence);
  return confidences.reduce((a, b) => a + b, 0) / confidences.length;
}

/**
 * Report data type for markdown and HTML generation
 */
interface ReportData {
  engagement: {
    id: string;
    name: string;
    target: { name: string; sector: string };
    thesis?: { summary: string };
    status: string;
  };
  summary: {
    hypothesis_count: number;
    evidence_count: number;
    contradiction_count: number;
    overall_confidence: number;
  };
  hypotheses: {
    id: string;
    content: string;
    type: string;
    status: string;
    confidence: number;
  }[];
  generated_at: number;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(data: ReportData): string {
  return `# Research Report: ${data.engagement.name}

## Executive Summary

**Target Company:** ${data.engagement.target.name}
**Investment Thesis:** ${data.engagement.thesis?.summary ?? 'Not specified'}

### Key Metrics
- **Hypotheses Tested:** ${data.summary.hypothesis_count}
- **Evidence Collected:** ${data.summary.evidence_count}
- **Contradictions Found:** ${data.summary.contradiction_count}
- **Overall Confidence:** ${(data.summary.overall_confidence * 100).toFixed(1)}%

## Hypothesis Analysis

${data.hypotheses.map((h) => `### ${h.content}
- **Type:** ${h.type}
- **Status:** ${h.status}
- **Confidence:** ${(h.confidence * 100).toFixed(1)}%
`).join('\n')}

---
*Report generated: ${new Date().toISOString()}*
`;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(data: ReportData): string {
  const confidenceColor = data.summary.overall_confidence > 0.7 ? '#28a745' : data.summary.overall_confidence > 0.4 ? '#ffc107' : '#dc3545';
  return `<!DOCTYPE html>
<html>
<head>
  <title>Research Report: ${data.engagement.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .metric { display: inline-block; margin-right: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    .hypothesis { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .confidence { font-weight: bold; color: ${confidenceColor}; }
  </style>
</head>
<body>
  <h1>Research Report: ${data.engagement.name}</h1>

  <h2>Executive Summary</h2>
  <p><strong>Target Company:</strong> ${data.engagement.target.name}</p>
  <p><strong>Investment Thesis:</strong> ${data.engagement.thesis?.summary ?? 'Not specified'}</p>

  <h3>Key Metrics</h3>
  <div class="metric">Hypotheses: ${data.summary.hypothesis_count}</div>
  <div class="metric">Evidence: ${data.summary.evidence_count}</div>
  <div class="metric">Contradictions: ${data.summary.contradiction_count}</div>
  <div class="metric">Confidence: <span class="confidence">${(data.summary.overall_confidence * 100).toFixed(1)}%</span></div>

  <h2>Hypothesis Analysis</h2>
  ${data.hypotheses.map((h) => `
  <div class="hypothesis">
    <h3>${h.content}</h3>
    <p><strong>Type:</strong> ${h.type} | <strong>Status:</strong> ${h.status} | <strong>Confidence:</strong> ${(h.confidence * 100).toFixed(1)}%</p>
  </div>
  `).join('')}

  <hr>
  <p><em>Report generated: ${new Date().toISOString()}</em></p>
</body>
</html>`;
}
