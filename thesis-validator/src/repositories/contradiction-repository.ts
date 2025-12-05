/**
 * Contradiction Repository - PostgreSQL persistence for contradictions
 */

import { getPool } from '../db/index.js';

export type ContradictionSeverity = 'low' | 'medium' | 'high';
export type ContradictionStatus = 'unresolved' | 'explained' | 'dismissed' | 'critical';

export interface CreateContradictionParams {
  engagementId: string;
  hypothesisId?: string;
  evidenceId?: string;
  description: string;
  severity: ContradictionSeverity;
  bearCaseTheme?: string;
  metadata?: Record<string, unknown>;
}

export interface ContradictionDTO {
  id: string;
  engagementId: string;
  hypothesisId: string | null;
  evidenceId: string | null;
  description: string;
  severity: ContradictionSeverity;
  status: ContradictionStatus;
  bearCaseTheme: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  metadata: Record<string, unknown>;
  foundAt: Date;
  resolvedAt: Date | null;
}

export interface ContradictionFilters {
  severity?: ContradictionSeverity;
  status?: ContradictionStatus;
  hypothesisId?: string;
  limit?: number;
  offset?: number;
}

export interface ContradictionStats {
  totalCount: number;
  bySeverity: Record<ContradictionSeverity, number>;
  byStatus: Record<ContradictionStatus, number>;
  unresolvedCount: number;
  criticalCount: number;
  resolutionRate: number;
}

export class ContradictionRepository {
  async create(params: CreateContradictionParams): Promise<ContradictionDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO contradictions (
        engagement_id, hypothesis_id, evidence_id, description, severity,
        bear_case_theme, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.engagementId,
        params.hypothesisId ?? null,
        params.evidenceId ?? null,
        params.description,
        params.severity,
        params.bearCaseTheme ?? null,
        params.metadata ?? {},
      ]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<ContradictionDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM contradictions WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getByEngagement(
    engagementId: string,
    filters: ContradictionFilters = {}
  ): Promise<ContradictionDTO[]> {
    const pool = getPool();
    const conditions: string[] = ['engagement_id = $1'];
    const values: unknown[] = [engagementId];
    let paramIndex = 2;

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      values.push(filters.severity);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.hypothesisId) {
      conditions.push(`hypothesis_id = $${paramIndex++}`);
      values.push(filters.hypothesisId);
    }

    let query = `SELECT * FROM contradictions WHERE ${conditions.join(' AND ')} ORDER BY
      CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      found_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const { rows } = await pool.query(query, values);
    return rows.map((row) => this.mapRowToDTO(row));
  }

  async update(
    id: string,
    updates: Partial<{
      description: string;
      severity: ContradictionSeverity;
      status: ContradictionStatus;
      bearCaseTheme: string;
      resolutionNotes: string;
      resolvedBy: string;
      metadata: Record<string, unknown>;
    }>
  ): Promise<ContradictionDTO | null> {
    const pool = getPool();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.severity !== undefined) {
      setClauses.push(`severity = $${paramIndex++}`);
      values.push(updates.severity);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.bearCaseTheme !== undefined) {
      setClauses.push(`bear_case_theme = $${paramIndex++}`);
      values.push(updates.bearCaseTheme);
    }
    if (updates.resolutionNotes !== undefined) {
      setClauses.push(`resolution_notes = $${paramIndex++}`);
      values.push(updates.resolutionNotes);
    }
    if (updates.resolvedBy !== undefined) {
      setClauses.push(`resolved_by = $${paramIndex++}`);
      values.push(updates.resolvedBy);
    }
    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(updates.metadata);
    }

    if (setClauses.length === 0) return this.getById(id);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE contradictions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async resolve(
    id: string,
    status: 'explained' | 'dismissed',
    resolutionNotes: string,
    resolvedBy: string
  ): Promise<ContradictionDTO | null> {
    return this.update(id, { status, resolutionNotes, resolvedBy });
  }

  async markCritical(id: string): Promise<ContradictionDTO | null> {
    return this.update(id, { status: 'critical' });
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM contradictions WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async getStats(engagementId: string): Promise<ContradictionStats> {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE severity = 'low') as severity_low,
        COUNT(*) FILTER (WHERE severity = 'medium') as severity_medium,
        COUNT(*) FILTER (WHERE severity = 'high') as severity_high,
        COUNT(*) FILTER (WHERE status = 'unresolved') as status_unresolved,
        COUNT(*) FILTER (WHERE status = 'explained') as status_explained,
        COUNT(*) FILTER (WHERE status = 'dismissed') as status_dismissed,
        COUNT(*) FILTER (WHERE status = 'critical') as status_critical
      FROM contradictions WHERE engagement_id = $1`,
      [engagementId]
    );

    const row = rows[0]!;
    const totalCount = parseInt(row.total_count as string, 10);
    const unresolvedCount = parseInt(row.status_unresolved as string, 10);
    const criticalCount = parseInt(row.status_critical as string, 10);
    const resolvedCount =
      parseInt(row.status_explained as string, 10) + parseInt(row.status_dismissed as string, 10);

    return {
      totalCount,
      bySeverity: {
        low: parseInt(row.severity_low as string, 10),
        medium: parseInt(row.severity_medium as string, 10),
        high: parseInt(row.severity_high as string, 10),
      },
      byStatus: {
        unresolved: unresolvedCount,
        explained: parseInt(row.status_explained as string, 10),
        dismissed: parseInt(row.status_dismissed as string, 10),
        critical: criticalCount,
      },
      unresolvedCount,
      criticalCount,
      resolutionRate: totalCount > 0 ? resolvedCount / totalCount : 0,
    };
  }

  private mapRowToDTO(row: Record<string, unknown>): ContradictionDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      hypothesisId: row.hypothesis_id as string | null,
      evidenceId: row.evidence_id as string | null,
      description: row.description as string,
      severity: row.severity as ContradictionSeverity,
      status: row.status as ContradictionStatus,
      bearCaseTheme: row.bear_case_theme as string | null,
      resolutionNotes: row.resolution_notes as string | null,
      resolvedBy: row.resolved_by as string | null,
      metadata: row.metadata as Record<string, unknown>,
      foundAt: row.found_at as Date,
      resolvedAt: row.resolved_at as Date | null,
    };
  }
}
