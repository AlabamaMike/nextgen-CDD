/**
 * Evidence Routes
 *
 * REST API endpoints for evidence and document management
 * Uses PostgreSQL repositories for persistence
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import {
  authHook,
  requireEngagementAccess,
  type AuthenticatedRequest,
} from '../middleware/index.js';
import { EvidenceRepository, DocumentRepository } from '../../repositories/index.js';
import type { EvidenceSourceType, EvidenceSentiment } from '../../models/evidence.js';
import type { DocumentFormat } from '../../repositories/document-repository.js';
import { createDocumentQueue, type DocumentJobData } from '../../workers/index.js';

// Extended request type with file method from @fastify/multipart
interface MultipartRequest extends FastifyRequest {
  file(): Promise<MultipartFile | undefined>;
}

// Initialize repositories
const evidenceRepo = new EvidenceRepository();
const documentRepo = new DocumentRepository();

// BullMQ queue for document processing
let documentQueue: ReturnType<typeof createDocumentQueue> | null = null;

function getDocumentQueue() {
  if (!documentQueue) {
    documentQueue = createDocumentQueue();
  }
  return documentQueue;
}

/**
 * Register evidence routes
 */
export async function registerEvidenceRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authHook);

  /**
   * Get evidence for engagement
   * GET /engagements/:engagementId/evidence
   */
  fastify.get(
    '/:engagementId/evidence',
    {
      preHandler: requireEngagementAccess('viewer'),
      schema: {
        querystring: z.object({
          source_type: z.enum(['web', 'document', 'expert', 'data', 'filing', 'financial']).optional(),
          sentiment: z.enum(['supporting', 'contradicting', 'neutral']).optional(),
          min_credibility: z.coerce.number().min(0).max(1).optional(),
          hypothesis_id: z.string().uuid().optional(),
          document_id: z.string().uuid().optional(),
          limit: z.coerce.number().min(1).max(100).default(20),
          offset: z.coerce.number().min(0).default(0),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Querystring: {
          source_type?: EvidenceSourceType;
          sentiment?: EvidenceSentiment;
          min_credibility?: number;
          hypothesis_id?: string;
          document_id?: string;
          limit: number;
          offset: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { source_type, sentiment, min_credibility, hypothesis_id, document_id, limit, offset } =
        request.query;

      const evidence = await evidenceRepo.getByEngagement(engagementId, {
        ...(source_type ? { sourceType: source_type } : {}),
        ...(sentiment ? { sentiment } : {}),
        ...(min_credibility !== undefined ? { minCredibility: min_credibility } : {}),
        ...(hypothesis_id ? { hypothesisId: hypothesis_id } : {}),
        ...(document_id ? { documentId: document_id } : {}),
        limit,
        offset,
      });

      reply.send({
        evidence,
        total: evidence.length,
        limit,
        offset,
      });
    }
  );

  /**
   * Get evidence statistics
   * GET /engagements/:engagementId/evidence/stats
   */
  fastify.get(
    '/:engagementId/evidence/stats',
    {
      preHandler: requireEngagementAccess('viewer'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const stats = await evidenceRepo.getStats(engagementId);
      reply.send({ stats });
    }
  );

  /**
   * Get single evidence with provenance
   * GET /engagements/:engagementId/evidence/:evidenceId
   */
  fastify.get(
    '/:engagementId/evidence/:evidenceId',
    {
      preHandler: requireEngagementAccess('viewer'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; evidenceId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, evidenceId } = request.params;

      const evidence = await evidenceRepo.getById(evidenceId);
      if (!evidence || evidence.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Evidence not found',
        });
        return;
      }

      reply.send({
        evidence,
        provenance: evidence.provenance,
      });
    }
  );

  /**
   * Add evidence manually
   * POST /engagements/:engagementId/evidence
   */
  fastify.post(
    '/:engagementId/evidence',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          content: z.string().min(1),
          sourceType: z.enum(['web', 'document', 'expert', 'data', 'filing', 'financial']),
          sourceUrl: z.string().url().optional(),
          sourceTitle: z.string().optional(),
          sourceAuthor: z.string().optional(),
          sourcePublicationDate: z.coerce.date().optional(),
          credibility: z.number().min(0).max(1).optional(),
          sentiment: z.enum(['supporting', 'neutral', 'contradicting']).optional(),
          hypothesisIds: z.array(z.string().uuid()).optional(),
          metadata: z.record(z.unknown()).optional(),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Body: {
          content: string;
          sourceType: EvidenceSourceType;
          sourceUrl?: string;
          sourceTitle?: string;
          sourceAuthor?: string;
          sourcePublicationDate?: Date;
          credibility?: number;
          sentiment?: EvidenceSentiment;
          hypothesisIds?: string[];
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const body = request.body;

      // Create evidence
      const evidence = await evidenceRepo.create({
        engagementId,
        content: body.content,
        sourceType: body.sourceType,
        ...(body.sourceUrl ? { sourceUrl: body.sourceUrl } : {}),
        ...(body.sourceTitle ? { sourceTitle: body.sourceTitle } : {}),
        ...(body.sourceAuthor ? { sourceAuthor: body.sourceAuthor } : {}),
        ...(body.sourcePublicationDate ? { sourcePublicationDate: body.sourcePublicationDate } : {}),
        ...(body.credibility !== undefined ? { credibility: body.credibility } : {}),
        ...(body.sentiment ? { sentiment: body.sentiment } : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
        retrievedAt: new Date(),
      });

      // Link to hypotheses if provided
      if (body.hypothesisIds) {
        for (const hypothesisId of body.hypothesisIds) {
          await evidenceRepo.linkToHypothesis(evidence.id, hypothesisId, 0.5);
        }
      }

      reply.status(201).send({
        evidence,
        message: 'Evidence added successfully',
      });
    }
  );

  /**
   * Update evidence
   * PATCH /engagements/:engagementId/evidence/:evidenceId
   */
  fastify.patch(
    '/:engagementId/evidence/:evidenceId',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          content: z.string().min(1).optional(),
          credibility: z.number().min(0).max(1).optional(),
          sentiment: z.enum(['supporting', 'neutral', 'contradicting']).optional(),
          metadata: z.record(z.unknown()).optional(),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; evidenceId: string };
        Body: {
          content?: string;
          credibility?: number;
          sentiment?: EvidenceSentiment;
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, evidenceId } = request.params;
      const updates = request.body;

      const existing = await evidenceRepo.getById(evidenceId);
      if (!existing || existing.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Evidence not found',
        });
        return;
      }

      const updated = await evidenceRepo.update(evidenceId, updates);

      reply.send({
        evidence: updated,
        message: 'Evidence updated successfully',
      });
    }
  );

  /**
   * Delete evidence
   * DELETE /engagements/:engagementId/evidence/:evidenceId
   */
  fastify.delete(
    '/:engagementId/evidence/:evidenceId',
    {
      preHandler: requireEngagementAccess('editor'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; evidenceId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, evidenceId } = request.params;

      const existing = await evidenceRepo.getById(evidenceId);
      if (!existing || existing.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Evidence not found',
        });
        return;
      }

      await evidenceRepo.delete(evidenceId);

      reply.send({
        message: 'Evidence deleted successfully',
      });
    }
  );

  /**
   * Link evidence to hypothesis
   * POST /engagements/:engagementId/evidence/:evidenceId/hypotheses
   */
  fastify.post(
    '/:engagementId/evidence/:evidenceId/hypotheses',
    {
      preHandler: requireEngagementAccess('editor'),
      schema: {
        body: z.object({
          hypothesisId: z.string().uuid(),
          relevanceScore: z.number().min(0).max(1).optional(),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; evidenceId: string };
        Body: { hypothesisId: string; relevanceScore?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, evidenceId } = request.params;
      const { hypothesisId, relevanceScore } = request.body;

      const existing = await evidenceRepo.getById(evidenceId);
      if (!existing || existing.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Evidence not found',
        });
        return;
      }

      await evidenceRepo.linkToHypothesis(evidenceId, hypothesisId, relevanceScore ?? 0.5);

      reply.status(201).send({
        message: 'Evidence linked to hypothesis',
      });
    }
  );

  /**
   * Unlink evidence from hypothesis
   * DELETE /engagements/:engagementId/evidence/:evidenceId/hypotheses/:hypothesisId
   */
  fastify.delete(
    '/:engagementId/evidence/:evidenceId/hypotheses/:hypothesisId',
    {
      preHandler: requireEngagementAccess('editor'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; evidenceId: string; hypothesisId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, evidenceId, hypothesisId } = request.params;

      const existing = await evidenceRepo.getById(evidenceId);
      if (!existing || existing.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Evidence not found',
        });
        return;
      }

      const unlinked = await evidenceRepo.unlinkFromHypothesis(evidenceId, hypothesisId);
      if (!unlinked) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Link not found',
        });
        return;
      }

      reply.send({
        message: 'Evidence unlinked from hypothesis',
      });
    }
  );

  // ============== Document Routes ==============

  /**
   * Upload document
   * POST /engagements/:engagementId/documents
   */
  fastify.post(
    '/:engagementId/documents',
    {
      preHandler: requireEngagementAccess('editor'),
    },
    async (request: FastifyRequest<{ Params: { engagementId: string } }>, reply: FastifyReply) => {
      const user = (request as AuthenticatedRequest).user;
      const { engagementId } = request.params;

      // Handle multipart upload
      const data = await (request as MultipartRequest).file();
      if (!data) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
        });
        return;
      }

      // Determine format from mime type
      let format: DocumentFormat = 'unknown';
      if (data.mimetype.includes('pdf')) format = 'pdf';
      else if (data.mimetype.includes('wordprocessingml')) format = 'docx';
      else if (data.mimetype.includes('spreadsheetml')) format = 'xlsx';
      else if (data.mimetype.includes('presentationml')) format = 'pptx';
      else if (data.mimetype.includes('html')) format = 'html';
      else if (data.mimetype.startsWith('image/')) format = 'image';

      // Read file content
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      // Save to temp storage
      const storagePath = `/tmp/documents/${crypto.randomUUID()}_${data.filename}`;
      await mkdir('/tmp/documents', { recursive: true });
      await writeFile(storagePath, buffer);

      // Create document record
      const document = await documentRepo.create({
        engagementId,
        filename: data.filename,
        originalFilename: data.filename,
        format,
        mimeType: data.mimetype,
        sizeBytes: buffer.length,
        storagePath,
        uploadedBy: user.id,
      });

      // Queue for processing
      const queue = getDocumentQueue();
      await queue.add('process', {
        documentId: document.id,
        engagementId,
        storagePath,
        mimeType: data.mimetype,
      } as DocumentJobData);

      reply.status(202).send({
        document_id: document.id,
        message: 'Document uploaded, processing started',
        status: 'pending',
      });
    }
  );

  /**
   * Get document status
   * GET /engagements/:engagementId/documents/:documentId
   */
  fastify.get(
    '/:engagementId/documents/:documentId',
    {
      preHandler: requireEngagementAccess('viewer'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; documentId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, documentId } = request.params;

      const document = await documentRepo.getById(documentId);
      if (!document || document.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Document not found',
        });
        return;
      }

      reply.send({ document });
    }
  );

  /**
   * List documents for engagement
   * GET /engagements/:engagementId/documents
   */
  fastify.get(
    '/:engagementId/documents',
    {
      preHandler: requireEngagementAccess('viewer'),
      schema: {
        querystring: z.object({
          status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
          format: z.enum(['pdf', 'docx', 'xlsx', 'pptx', 'html', 'image', 'unknown']).optional(),
          limit: z.coerce.number().min(1).max(100).default(20),
          offset: z.coerce.number().min(0).default(0),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string };
        Querystring: {
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          format?: DocumentFormat;
          limit: number;
          offset: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId } = request.params;
      const { status, format, limit, offset } = request.query;

      const documents = await documentRepo.getByEngagement(engagementId, {
        ...(status ? { status } : {}),
        ...(format ? { format } : {}),
        limit,
        offset,
      });

      reply.send({
        documents,
        total: documents.length,
        limit,
        offset,
      });
    }
  );

  /**
   * Delete document
   * DELETE /engagements/:engagementId/documents/:documentId
   */
  fastify.delete(
    '/:engagementId/documents/:documentId',
    {
      preHandler: requireEngagementAccess('editor'),
    },
    async (
      request: FastifyRequest<{
        Params: { engagementId: string; documentId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { engagementId, documentId } = request.params;

      const document = await documentRepo.getById(documentId);
      if (!document || document.engagementId !== engagementId) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Document not found',
        });
        return;
      }

      // Delete associated evidence
      const evidence = await evidenceRepo.getByEngagement(engagementId, { documentId });
      for (const e of evidence) {
        await evidenceRepo.delete(e.id);
      }

      // Delete document
      await documentRepo.delete(documentId);

      // Note: In production, also delete file from storage

      reply.send({
        message: 'Document and associated evidence deleted successfully',
      });
    }
  );
}
