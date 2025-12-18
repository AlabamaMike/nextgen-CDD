/**
 * Research Job Repository - PostgreSQL persistence for research job tracking
 */

import { getPool } from '../db/index.js';

export type ResearchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'partial';

export interface CreateResearchJobParams {
  engagementId: string;
  config?: Record<string, unknown>;
}

export interface ResearchJobDTO {
  id: string;
  engagementId: string;
  status: ResearchJobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  config: Record<string, unknown>;
  results: Record<string, unknown> | null;
  confidenceScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ResearchJobRepository {
  async create(params: CreateResearchJobParams): Promise<ResearchJobDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO research_jobs (engagement_id, status, config)
       VALUES ($1, 'queued', $2)
       RETURNING *`,
      [params.engagementId, JSON.stringify(params.config ?? {})]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<ResearchJobDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM research_jobs WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getByEngagement(
    engagementId: string,
    options?: { limit?: number; status?: ResearchJobStatus }
  ): Promise<ResearchJobDTO[]> {
    const pool = getPool();
    const limit = options?.limit ?? 50;

    let query = 'SELECT * FROM research_jobs WHERE engagement_id = $1';
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

  /**
   * Get active (queued or running) job for an engagement
   * Used to prevent duplicate job submissions
   */
  async getActiveByEngagement(engagementId: string): Promise<ResearchJobDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM research_jobs
       WHERE engagement_id = $1 AND status IN ('queued', 'running')
       ORDER BY created_at DESC LIMIT 1`,
      [engagementId]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async markRunning(id: string): Promise<ResearchJobDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE research_jobs
       SET status = 'running', started_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async markCompleted(
    id: string,
    results: Record<string, unknown>,
    confidenceScore: number
  ): Promise<ResearchJobDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE research_jobs
       SET status = 'completed', completed_at = NOW(), results = $2, confidence_score = $3
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(results), confidenceScore]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async markFailed(id: string, errorMessage: string): Promise<ResearchJobDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE research_jobs
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE id = $1
       RETURNING *`,
      [id, errorMessage]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE research_jobs SET config = jsonb_set(COALESCE(config, '{}'), '{progress}', $2::jsonb) WHERE id = $1`,
      [id, JSON.stringify(progress)]
    );
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM research_jobs WHERE id = $1',
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  private mapRowToDTO(row: Record<string, unknown>): ResearchJobDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      status: row.status as ResearchJobStatus,
      startedAt: row.started_at as Date | null,
      completedAt: row.completed_at as Date | null,
      errorMessage: row.error_message as string | null,
      config: (row.config as Record<string, unknown>) ?? {},
      results: row.results as Record<string, unknown> | null,
      confidenceScore: row.confidence_score as number | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
