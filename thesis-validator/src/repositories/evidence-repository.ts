/**
 * Evidence Repository - PostgreSQL persistence for evidence
 */

import { getPool } from '../db/index.js';
import type { EvidenceSentiment, EvidenceSourceType } from '../models/evidence.js';

export interface CreateEvidenceParams {
  engagementId: string;
  content: string;
  sourceType: EvidenceSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceAuthor?: string;
  sourcePublicationDate?: Date;
  credibility?: number;
  sentiment?: EvidenceSentiment;
  documentId?: string;
  provenance?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  retrievedAt?: Date;
}

export interface EvidenceDTO {
  id: string;
  engagementId: string;
  content: string;
  sourceType: EvidenceSourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourcePublicationDate: Date | null;
  credibility: number | null;
  sentiment: EvidenceSentiment;
  documentId: string | null;
  provenance: Record<string, unknown>;
  metadata: Record<string, unknown>;
  retrievedAt: Date | null;
  createdAt: Date;
  linkedHypotheses?: Array<{ hypothesisId: string; relevanceScore: number }>;
}

export interface EvidenceFilters {
  sourceType?: EvidenceSourceType;
  sentiment?: EvidenceSentiment;
  minCredibility?: number;
  maxCredibility?: number;
  hypothesisId?: string;
  documentId?: string;
  limit?: number;
  offset?: number;
}

export interface EvidenceStats {
  totalCount: number;
  bySourceType: Record<string, number>;
  bySentiment: Record<string, number>;
  averageCredibility: number;
  hypothesisCoverage: number;
}

export class EvidenceRepository {
  async create(params: CreateEvidenceParams): Promise<EvidenceDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO evidence (
        engagement_id, content, source_type, source_url, source_title,
        source_author, source_publication_date, credibility, sentiment,
        document_id, provenance, metadata, retrieved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        params.engagementId,
        params.content,
        params.sourceType,
        params.sourceUrl ?? null,
        params.sourceTitle ?? null,
        params.sourceAuthor ?? null,
        params.sourcePublicationDate ?? null,
        params.credibility ?? 0.5,
        params.sentiment ?? 'neutral',
        params.documentId ?? null,
        params.provenance ?? {},
        params.metadata ?? {},
        params.retrievedAt ?? null,
      ]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<EvidenceDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM evidence WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;

    const evidence = this.mapRowToDTO(rows[0]!);
    evidence.linkedHypotheses = await this.getLinkedHypotheses(id);
    return evidence;
  }

  async getByEngagement(engagementId: string, filters: EvidenceFilters = {}): Promise<EvidenceDTO[]> {
    const pool = getPool();
    const conditions: string[] = ['engagement_id = $1'];
    const values: unknown[] = [engagementId];
    let paramIndex = 2;

    if (filters.sourceType) {
      conditions.push(`source_type = $${paramIndex++}`);
      values.push(filters.sourceType);
    }
    if (filters.sentiment) {
      conditions.push(`sentiment = $${paramIndex++}`);
      values.push(filters.sentiment);
    }
    if (filters.minCredibility !== undefined) {
      conditions.push(`credibility >= $${paramIndex++}`);
      values.push(filters.minCredibility);
    }
    if (filters.maxCredibility !== undefined) {
      conditions.push(`credibility <= $${paramIndex++}`);
      values.push(filters.maxCredibility);
    }
    if (filters.documentId) {
      conditions.push(`document_id = $${paramIndex++}`);
      values.push(filters.documentId);
    }

    let query = `SELECT * FROM evidence WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const { rows } = await pool.query(query, values);

    // If filtering by hypothesis, apply that filter
    let evidence = rows.map(row => this.mapRowToDTO(row));

    if (filters.hypothesisId) {
      const { rows: linkedEvidence } = await pool.query(
        'SELECT evidence_id FROM evidence_hypotheses WHERE hypothesis_id = $1',
        [filters.hypothesisId]
      );
      const linkedIds = new Set(linkedEvidence.map(r => r.evidence_id));
      evidence = evidence.filter(e => linkedIds.has(e.id));
    }

    return evidence;
  }

  async update(id: string, updates: Partial<{
    content: string;
    credibility: number;
    sentiment: EvidenceSentiment;
    metadata: Record<string, unknown>;
  }>): Promise<EvidenceDTO | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      setClauses.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.credibility !== undefined) {
      setClauses.push(`credibility = $${paramIndex++}`);
      values.push(updates.credibility);
    }
    if (updates.sentiment !== undefined) {
      setClauses.push(`sentiment = $${paramIndex++}`);
      values.push(updates.sentiment);
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(updates.metadata);
    }

    if (setClauses.length === 0) return this.getById(id);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE evidence SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM evidence WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async linkToHypothesis(evidenceId: string, hypothesisId: string, relevanceScore: number = 0.5): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO evidence_hypotheses (evidence_id, hypothesis_id, relevance_score)
       VALUES ($1, $2, $3)
       ON CONFLICT (evidence_id, hypothesis_id) DO UPDATE SET relevance_score = $3`,
      [evidenceId, hypothesisId, relevanceScore]
    );
  }

  async unlinkFromHypothesis(evidenceId: string, hypothesisId: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM evidence_hypotheses WHERE evidence_id = $1 AND hypothesis_id = $2',
      [evidenceId, hypothesisId]
    );
    return (rowCount ?? 0) > 0;
  }

  async getLinkedHypotheses(evidenceId: string): Promise<Array<{ hypothesisId: string; relevanceScore: number }>> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT hypothesis_id, relevance_score FROM evidence_hypotheses WHERE evidence_id = $1',
      [evidenceId]
    );
    return rows.map(r => ({
      hypothesisId: r.hypothesis_id as string,
      relevanceScore: parseFloat(r.relevance_score as string),
    }));
  }

  async getStats(engagementId: string): Promise<EvidenceStats> {
    const pool = getPool();

    // Get counts and averages
    const { rows: stats } = await pool.query(`
      SELECT
        COUNT(*) as total_count,
        AVG(credibility) as avg_credibility
      FROM evidence WHERE engagement_id = $1
    `, [engagementId]);

    // Get by source type
    const { rows: bySource } = await pool.query(`
      SELECT source_type, COUNT(*) as count
      FROM evidence WHERE engagement_id = $1
      GROUP BY source_type
    `, [engagementId]);

    // Get by sentiment
    const { rows: bySentiment } = await pool.query(`
      SELECT sentiment, COUNT(*) as count
      FROM evidence WHERE engagement_id = $1
      GROUP BY sentiment
    `, [engagementId]);

    // Get hypothesis coverage
    const { rows: coverage } = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT hypothesis_id) FROM evidence_hypotheses eh
         JOIN evidence e ON e.id = eh.evidence_id
         WHERE e.engagement_id = $1) as linked_hypotheses,
        (SELECT COUNT(*) FROM hypotheses WHERE engagement_id = $1) as total_hypotheses
    `, [engagementId]);

    const totalHypotheses = parseInt(coverage[0]?.total_hypotheses as string ?? '0');
    const linkedHypotheses = parseInt(coverage[0]?.linked_hypotheses as string ?? '0');

    return {
      totalCount: parseInt(stats[0]?.total_count as string ?? '0'),
      averageCredibility: parseFloat(stats[0]?.avg_credibility as string ?? '0'),
      bySourceType: Object.fromEntries(bySource.map(r => [r.source_type, parseInt(r.count as string)])),
      bySentiment: Object.fromEntries(bySentiment.map(r => [r.sentiment, parseInt(r.count as string)])),
      hypothesisCoverage: totalHypotheses > 0 ? linkedHypotheses / totalHypotheses : 0,
    };
  }

  private mapRowToDTO(row: Record<string, unknown>): EvidenceDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      content: row.content as string,
      sourceType: row.source_type as EvidenceSourceType,
      sourceUrl: row.source_url as string | null,
      sourceTitle: row.source_title as string | null,
      sourceAuthor: row.source_author as string | null,
      sourcePublicationDate: row.source_publication_date as Date | null,
      credibility: row.credibility ? parseFloat(row.credibility as string) : null,
      sentiment: row.sentiment as EvidenceSentiment,
      documentId: row.document_id as string | null,
      provenance: row.provenance as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown>,
      retrievedAt: row.retrieved_at as Date | null,
      createdAt: row.created_at as Date,
    };
  }
}
