/**
 * Metrics Repository - PostgreSQL persistence for research quality metrics
 */

import { getPool } from '../db/index.js';

export type MetricType =
  | 'evidence_credibility_avg'
  | 'source_diversity_score'
  | 'hypothesis_coverage'
  | 'contradiction_resolution_rate'
  | 'overall_confidence'
  | 'stress_test_vulnerability'
  | 'research_completeness';

export interface CreateMetricParams {
  engagementId: string;
  metricType: MetricType;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface MetricDTO {
  id: string;
  engagementId: string;
  metricType: MetricType;
  value: number;
  metadata: Record<string, unknown>;
  recordedAt: Date;
}

export interface ResearchQualityMetrics {
  evidenceCredibilityAvg: number;
  sourceDiversityScore: number;
  hypothesisCoverage: number;
  contradictionResolutionRate: number;
  overallConfidence: number;
  lastUpdated: Date | null;
}

export class MetricsRepository {
  async record(params: CreateMetricParams): Promise<MetricDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO research_metrics (engagement_id, metric_type, value, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.engagementId, params.metricType, params.value, params.metadata ?? {}]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async recordBatch(params: CreateMetricParams[]): Promise<MetricDTO[]> {
    const results: MetricDTO[] = [];
    for (const p of params) {
      results.push(await this.record(p));
    }
    return results;
  }

  async getLatest(engagementId: string, metricType: MetricType): Promise<MetricDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM research_metrics
       WHERE engagement_id = $1 AND metric_type = $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [engagementId, metricType]
    );
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getHistory(
    engagementId: string,
    metricType: MetricType,
    limit = 50
  ): Promise<MetricDTO[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM research_metrics
       WHERE engagement_id = $1 AND metric_type = $2
       ORDER BY recorded_at DESC LIMIT $3`,
      [engagementId, metricType, limit]
    );
    return rows.map((row) => this.mapRowToDTO(row));
  }

  async getAllLatest(engagementId: string): Promise<Record<MetricType, MetricDTO | null>> {
    const metricTypes: MetricType[] = [
      'evidence_credibility_avg',
      'source_diversity_score',
      'hypothesis_coverage',
      'contradiction_resolution_rate',
      'overall_confidence',
      'stress_test_vulnerability',
      'research_completeness',
    ];

    const result: Record<MetricType, MetricDTO | null> = {} as any;
    for (const type of metricTypes) {
      result[type] = await this.getLatest(engagementId, type);
    }
    return result;
  }

  async getResearchQuality(engagementId: string): Promise<ResearchQualityMetrics> {
    const latest = await this.getAllLatest(engagementId);

    return {
      evidenceCredibilityAvg: latest['evidence_credibility_avg']?.value ?? 0,
      sourceDiversityScore: latest['source_diversity_score']?.value ?? 0,
      hypothesisCoverage: latest['hypothesis_coverage']?.value ?? 0,
      contradictionResolutionRate: latest['contradiction_resolution_rate']?.value ?? 0,
      overallConfidence: latest['overall_confidence']?.value ?? 0,
      lastUpdated: this.findLatestDate(latest),
    };
  }

  async calculateAndRecordMetrics(engagementId: string): Promise<ResearchQualityMetrics> {
    const pool = getPool();

    // Calculate evidence credibility average
    const { rows: credRows } = await pool.query(
      `SELECT AVG(credibility) as avg_credibility FROM evidence WHERE engagement_id = $1`,
      [engagementId]
    );
    const evidenceCredibilityAvg = parseFloat(credRows[0]?.avg_credibility as string) || 0;

    // Calculate source diversity (number of unique source types / 6 types possible)
    const { rows: diversityRows } = await pool.query(
      `SELECT COUNT(DISTINCT source_type) as unique_sources FROM evidence WHERE engagement_id = $1`,
      [engagementId]
    );
    const sourceDiversityScore = (parseInt(diversityRows[0]?.unique_sources as string, 10) || 0) / 6;

    // Calculate hypothesis coverage (% of hypotheses with linked evidence)
    const { rows: coverageRows } = await pool.query(
      `SELECT
        COUNT(DISTINCT h.id) as total_hypotheses,
        COUNT(DISTINCT eh.hypothesis_id) as covered_hypotheses
       FROM hypotheses h
       LEFT JOIN evidence_hypotheses eh ON h.id = eh.hypothesis_id
       WHERE h.engagement_id = $1`,
      [engagementId]
    );
    const totalHypotheses = parseInt(coverageRows[0]?.total_hypotheses as string, 10) || 0;
    const coveredHypotheses = parseInt(coverageRows[0]?.covered_hypotheses as string, 10) || 0;
    const hypothesisCoverage = totalHypotheses > 0 ? coveredHypotheses / totalHypotheses : 0;

    // Calculate contradiction resolution rate
    const { rows: contRows } = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('explained', 'dismissed')) as resolved
       FROM contradictions WHERE engagement_id = $1`,
      [engagementId]
    );
    const totalContradictions = parseInt(contRows[0]?.total as string, 10) || 0;
    const resolvedContradictions = parseInt(contRows[0]?.resolved as string, 10) || 0;
    const contradictionResolutionRate = totalContradictions > 0 ? resolvedContradictions / totalContradictions : 1;

    // Calculate overall confidence (weighted average of hypothesis confidences)
    const { rows: confRows } = await pool.query(
      `SELECT AVG(confidence) as avg_confidence FROM hypotheses WHERE engagement_id = $1`,
      [engagementId]
    );
    const overallConfidence = parseFloat(confRows[0]?.avg_confidence as string) || 0.5;

    // Record all metrics
    const metricsToRecord: CreateMetricParams[] = [
      { engagementId, metricType: 'evidence_credibility_avg', value: evidenceCredibilityAvg },
      { engagementId, metricType: 'source_diversity_score', value: sourceDiversityScore },
      { engagementId, metricType: 'hypothesis_coverage', value: hypothesisCoverage },
      { engagementId, metricType: 'contradiction_resolution_rate', value: contradictionResolutionRate },
      { engagementId, metricType: 'overall_confidence', value: overallConfidence },
    ];

    await this.recordBatch(metricsToRecord);

    return {
      evidenceCredibilityAvg,
      sourceDiversityScore,
      hypothesisCoverage,
      contradictionResolutionRate,
      overallConfidence,
      lastUpdated: new Date(),
    };
  }

  private findLatestDate(metrics: Record<MetricType, MetricDTO | null>): Date | null {
    let latest: Date | null = null;
    for (const metric of Object.values(metrics)) {
      if (metric?.recordedAt) {
        if (!latest || metric.recordedAt > latest) {
          latest = metric.recordedAt;
        }
      }
    }
    return latest;
  }

  private mapRowToDTO(row: Record<string, unknown>): MetricDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      metricType: row.metric_type as MetricType,
      value: parseFloat(row.value as string),
      metadata: row.metadata as Record<string, unknown>,
      recordedAt: row.recorded_at as Date,
    };
  }
}
