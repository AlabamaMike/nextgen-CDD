/**
 * Stress Test Repository - PostgreSQL persistence for stress test runs
 */

import { getPool } from '../db/index.js';

export type StressTestStatus = 'pending' | 'running' | 'completed' | 'failed';
export type StressTestIntensity = 'light' | 'moderate' | 'aggressive';

export interface CreateStressTestParams {
  engagementId: string;
  intensity: StressTestIntensity;
  hypothesisIds?: string[];
}

export interface StressTestDTO {
  id: string;
  engagementId: string;
  intensity: StressTestIntensity;
  hypothesisIds: string[];
  status: StressTestStatus;
  results: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface UpdateStressTestParams {
  status?: StressTestStatus;
  results?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export class StressTestRepository {
  async create(params: CreateStressTestParams): Promise<StressTestDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO stress_tests (engagement_id, intensity, hypothesis_ids)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [params.engagementId, params.intensity, params.hypothesisIds ?? []]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<StressTestDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM stress_tests WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getByEngagement(
    engagementId: string,
    options?: { limit?: number; status?: StressTestStatus }
  ): Promise<StressTestDTO[]> {
    const pool = getPool();
    const limit = options?.limit ?? 50;

    let query = 'SELECT * FROM stress_tests WHERE engagement_id = $1';
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

  async update(id: string, params: UpdateStressTestParams): Promise<StressTestDTO | null> {
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
      `UPDATE stress_tests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async markRunning(id: string): Promise<StressTestDTO | null> {
    return this.update(id, { status: 'running', startedAt: new Date() });
  }

  async markCompleted(id: string, results: Record<string, unknown>): Promise<StressTestDTO | null> {
    return this.update(id, { status: 'completed', results, completedAt: new Date() });
  }

  async markFailed(id: string, errorMessage: string): Promise<StressTestDTO | null> {
    return this.update(id, { status: 'failed', errorMessage, completedAt: new Date() });
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM stress_tests WHERE id = $1',
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  async getStats(engagementId: string): Promise<{
    totalCount: number;
    byStatus: Record<StressTestStatus, number>;
    byIntensity: Record<StressTestIntensity, number>;
    avgDurationMs: number | null;
    lastRunAt: Date | null;
  }> {
    const pool = getPool();

    const { rows: countRows } = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE intensity = 'light') as light,
        COUNT(*) FILTER (WHERE intensity = 'moderate') as moderate,
        COUNT(*) FILTER (WHERE intensity = 'aggressive') as aggressive,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
          FILTER (WHERE status = 'completed') as avg_duration_ms,
        MAX(created_at) as last_run_at
       FROM stress_tests WHERE engagement_id = $1`,
      [engagementId]
    );

    const row = countRows[0]!;

    return {
      totalCount: parseInt(row.total as string, 10),
      byStatus: {
        pending: parseInt(row.pending as string, 10),
        running: parseInt(row.running as string, 10),
        completed: parseInt(row.completed as string, 10),
        failed: parseInt(row.failed as string, 10),
      },
      byIntensity: {
        light: parseInt(row.light as string, 10),
        moderate: parseInt(row.moderate as string, 10),
        aggressive: parseInt(row.aggressive as string, 10),
      },
      avgDurationMs: row.avg_duration_ms ? parseFloat(row.avg_duration_ms as string) : null,
      lastRunAt: row.last_run_at as Date | null,
    };
  }

  private mapRowToDTO(row: Record<string, unknown>): StressTestDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      intensity: row.intensity as StressTestIntensity,
      hypothesisIds: (row.hypothesis_ids as string[]) ?? [],
      status: row.status as StressTestStatus,
      results: row.results as Record<string, unknown> | null,
      errorMessage: row.error_message as string | null,
      startedAt: row.started_at as Date | null,
      completedAt: row.completed_at as Date | null,
      createdAt: row.created_at as Date,
    };
  }
}
