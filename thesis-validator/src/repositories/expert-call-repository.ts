/**
 * Expert Call Repository - PostgreSQL persistence for expert call transcripts and analysis
 */

import { createHash } from 'node:crypto';
import { getPool } from '../db/index.js';

/**
 * Compute a hash of the transcript for duplicate detection
 * Normalizes whitespace to handle minor formatting differences
 */
function computeTranscriptHash(transcript: string): string {
  // Normalize: lowercase, collapse whitespace, trim
  const normalized = transcript
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256').update(normalized).digest('hex');
}

export type ExpertCallStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateExpertCallParams {
  engagementId: string;
  transcript: string;
  callDate?: string;
  speakerLabels?: Record<string, string>;
  focusAreas?: string[];
  intervieweeName?: string;
  intervieweeTitle?: string;
  sourceFilename?: string;
}

export interface ExpertCallDTO {
  id: string;
  engagementId: string;
  status: ExpertCallStatus;
  transcript: string | null;
  transcriptHash: string | null;
  speakerLabels: Record<string, string>;
  focusAreas: string[];
  callDate: Date | null;
  intervieweeName: string | null;
  intervieweeTitle: string | null;
  sourceFilename: string | null;
  results: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateExpertCallParams {
  status?: ExpertCallStatus;
  results?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export class ExpertCallRepository {
  /**
   * Create a new expert call record
   * Computes and stores a hash of the transcript for duplicate detection
   */
  async create(params: CreateExpertCallParams): Promise<ExpertCallDTO> {
    const pool = getPool();
    const transcriptHash = computeTranscriptHash(params.transcript);

    const { rows } = await pool.query(
      `INSERT INTO expert_calls (engagement_id, transcript, transcript_hash, call_date, speaker_labels, focus_areas, interviewee_name, interviewee_title, source_filename)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.engagementId,
        params.transcript,
        transcriptHash,
        params.callDate ? new Date(params.callDate) : null,
        JSON.stringify(params.speakerLabels ?? {}),
        params.focusAreas ?? [],
        params.intervieweeName ?? null,
        params.intervieweeTitle ?? null,
        params.sourceFilename ?? null,
      ]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  /**
   * Compute transcript hash without creating a record
   * Used for batch duplicate detection
   */
  computeHash(transcript: string): string {
    return computeTranscriptHash(transcript);
  }

  /**
   * Find existing calls by multiple hashes in a single query
   * Returns a map of hash -> existing call
   */
  async findByTranscriptHashes(engagementId: string, hashes: string[]): Promise<Map<string, ExpertCallDTO>> {
    if (hashes.length === 0) return new Map();

    const pool = getPool();
    const placeholders = hashes.map((_, i) => `$${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `SELECT * FROM expert_calls WHERE engagement_id = $1 AND transcript_hash IN (${placeholders})`,
      [engagementId, ...hashes]
    );

    const result = new Map<string, ExpertCallDTO>();
    for (const row of rows) {
      const dto = this.mapRowToDTO(row);
      if (dto.transcriptHash) {
        result.set(dto.transcriptHash, dto);
      }
    }
    return result;
  }

  /**
   * Find an existing expert call by transcript hash within an engagement
   * Returns the existing call if a duplicate is found, null otherwise
   */
  async findByTranscriptHash(engagementId: string, transcript: string): Promise<ExpertCallDTO | null> {
    const pool = getPool();
    const transcriptHash = computeTranscriptHash(transcript);

    const { rows } = await pool.query(
      'SELECT * FROM expert_calls WHERE engagement_id = $1 AND transcript_hash = $2',
      [engagementId, transcriptHash]
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<ExpertCallDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM expert_calls WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getByEngagement(
    engagementId: string,
    options?: { limit?: number; status?: ExpertCallStatus }
  ): Promise<ExpertCallDTO[]> {
    const pool = getPool();
    const limit = options?.limit ?? 50;

    let query = 'SELECT * FROM expert_calls WHERE engagement_id = $1';
    const params: (string | number)[] = [engagementId];

    if (options?.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const { rows } = await pool.query(query, params);
    return rows.map((row) => this.mapRowToDTO(row));
  }

  async update(id: string, params: UpdateExpertCallParams): Promise<ExpertCallDTO | null> {
    const pool = getPool();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }
    if (params.results !== undefined) {
      updates.push(`results = $${paramIndex++}`);
      values.push(JSON.stringify(params.results));
    }
    if (params.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(params.errorMessage);
    }
    if (params.startedAt !== undefined) {
      updates.push(`started_at = $${paramIndex++}`);
      values.push(params.startedAt);
    }
    if (params.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(params.completedAt);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE expert_calls SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async markProcessing(id: string): Promise<ExpertCallDTO | null> {
    return this.update(id, { status: 'processing', startedAt: new Date() });
  }

  async markCompleted(id: string, results: Record<string, unknown>): Promise<ExpertCallDTO | null> {
    return this.update(id, { status: 'completed', results, completedAt: new Date() });
  }

  async markFailed(id: string, errorMessage: string): Promise<ExpertCallDTO | null> {
    return this.update(id, { status: 'failed', errorMessage, completedAt: new Date() });
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM expert_calls WHERE id = $1',
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  async getStats(engagementId: string): Promise<{
    totalCount: number;
    byStatus: Record<ExpertCallStatus, number>;
    avgDurationMs: number | null;
    lastCallAt: Date | null;
  }> {
    const pool = getPool();

    const { rows: countRows } = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
          FILTER (WHERE status = 'completed') as avg_duration_ms,
        MAX(created_at) as last_call_at
       FROM expert_calls WHERE engagement_id = $1`,
      [engagementId]
    );

    const row = countRows[0]!;

    return {
      totalCount: parseInt(row.total as string, 10),
      byStatus: {
        pending: parseInt(row.pending as string, 10),
        processing: parseInt(row.processing as string, 10),
        completed: parseInt(row.completed as string, 10),
        failed: parseInt(row.failed as string, 10),
      },
      avgDurationMs: row.avg_duration_ms ? parseFloat(row.avg_duration_ms as string) : null,
      lastCallAt: row.last_call_at as Date | null,
    };
  }

  private mapRowToDTO(row: Record<string, unknown>): ExpertCallDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      status: row.status as ExpertCallStatus,
      transcript: row.transcript as string | null,
      transcriptHash: row.transcript_hash as string | null,
      speakerLabels: (row.speaker_labels as Record<string, string>) ?? {},
      focusAreas: (row.focus_areas as string[]) ?? [],
      callDate: row.call_date as Date | null,
      intervieweeName: row.interviewee_name as string | null,
      intervieweeTitle: row.interviewee_title as string | null,
      sourceFilename: row.source_filename as string | null,
      results: row.results as Record<string, unknown> | null,
      errorMessage: row.error_message as string | null,
      startedAt: row.started_at as Date | null,
      completedAt: row.completed_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
