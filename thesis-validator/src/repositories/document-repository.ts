/**
 * Document Repository - PostgreSQL persistence for documents
 */

import { getPool } from '../db/index.js';

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'image' | 'unknown';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateDocumentParams {
  engagementId: string;
  filename: string;
  originalFilename: string;
  format: DocumentFormat;
  mimeType?: string;
  sizeBytes?: number;
  storagePath?: string;
  uploadedBy: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentDTO {
  id: string;
  engagementId: string;
  filename: string;
  originalFilename: string;
  format: DocumentFormat;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  uploadedBy: string | null;
  uploadedAt: Date;
  processedAt: Date | null;
}

export interface DocumentFilters {
  status?: DocumentStatus;
  format?: DocumentFormat;
  limit?: number;
  offset?: number;
}

export class DocumentRepository {
  async create(params: CreateDocumentParams): Promise<DocumentDTO> {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO documents (
        engagement_id, filename, original_filename, format, mime_type,
        size_bytes, storage_path, uploaded_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        params.engagementId,
        params.filename,
        params.originalFilename,
        params.format,
        params.mimeType ?? null,
        params.sizeBytes ?? null,
        params.storagePath ?? null,
        params.uploadedBy,
        params.metadata ?? {},
      ]
    );
    return this.mapRowToDTO(rows[0]!);
  }

  async getById(id: string): Promise<DocumentDTO | null> {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async getByEngagement(engagementId: string, filters: DocumentFilters = {}): Promise<DocumentDTO[]> {
    const pool = getPool();
    const conditions: string[] = ['engagement_id = $1'];
    const values: unknown[] = [engagementId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.format) {
      conditions.push(`format = $${paramIndex++}`);
      values.push(filters.format);
    }

    let query = `SELECT * FROM documents WHERE ${conditions.join(' AND ')} ORDER BY uploaded_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const { rows } = await pool.query(query, values);
    return rows.map(row => this.mapRowToDTO(row));
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    updates?: { chunkCount?: number; errorMessage?: string }
  ): Promise<DocumentDTO | null> {
    const pool = getPool();
    const setClauses = ['status = $1'];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (status === 'completed' || status === 'failed') {
      setClauses.push(`processed_at = NOW()`);
    }
    if (updates?.chunkCount !== undefined) {
      setClauses.push(`chunk_count = $${paramIndex++}`);
      values.push(updates.chunkCount);
    }
    if (updates?.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE documents SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;
    return this.mapRowToDTO(rows[0]!);
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  private mapRowToDTO(row: Record<string, unknown>): DocumentDTO {
    return {
      id: row.id as string,
      engagementId: row.engagement_id as string,
      filename: row.filename as string,
      originalFilename: row.original_filename as string,
      format: row.format as DocumentFormat,
      mimeType: row.mime_type as string | null,
      sizeBytes: row.size_bytes as number | null,
      storagePath: row.storage_path as string | null,
      status: row.status as DocumentStatus,
      chunkCount: row.chunk_count as number,
      errorMessage: row.error_message as string | null,
      metadata: row.metadata as Record<string, unknown>,
      uploadedBy: row.uploaded_by as string | null,
      uploadedAt: row.uploaded_at as Date,
      processedAt: row.processed_at as Date | null,
    };
  }
}
