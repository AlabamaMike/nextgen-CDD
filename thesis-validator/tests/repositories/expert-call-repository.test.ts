/**
 * Expert Call Repository Tests
 *
 * Unit tests for the expert call repository including hash computation and duplicate detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock query function
const mockQuery = vi.fn();

// Mock the database pool before importing the module
vi.mock('../../src/db/index.js', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

import { ExpertCallRepository } from '../../src/repositories/expert-call-repository.js';

describe('ExpertCallRepository', () => {
  let repository: ExpertCallRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    repository = new ExpertCallRepository();
  });

  describe('computeHash', () => {
    it('should compute consistent hash for same transcript', () => {
      const transcript = 'Hello, this is a test transcript.';
      const hash1 = repository.computeHash(transcript);
      const hash2 = repository.computeHash(transcript);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should compute same hash regardless of whitespace differences', () => {
      const transcript1 = 'Hello,   this is   a test.';
      const transcript2 = 'Hello, this is a test.';
      const transcript3 = '  Hello, this is a test.  ';

      const hash1 = repository.computeHash(transcript1);
      const hash2 = repository.computeHash(transcript2);
      const hash3 = repository.computeHash(transcript3);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should compute same hash regardless of case differences', () => {
      const transcript1 = 'Hello World';
      const transcript2 = 'hello world';
      const transcript3 = 'HELLO WORLD';

      const hash1 = repository.computeHash(transcript1);
      const hash2 = repository.computeHash(transcript2);
      const hash3 = repository.computeHash(transcript3);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should compute different hash for different content', () => {
      const transcript1 = 'Hello World';
      const transcript2 = 'Goodbye World';

      const hash1 = repository.computeHash(transcript1);
      const hash2 = repository.computeHash(transcript2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle newlines and tabs as whitespace', () => {
      const transcript1 = 'Hello\n\nWorld\t\tTest';
      const transcript2 = 'Hello World Test';

      const hash1 = repository.computeHash(transcript1);
      const hash2 = repository.computeHash(transcript2);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = repository.computeHash('   ');
      expect(hash).toHaveLength(64);
    });

    it('should produce valid SHA-256 hex output', () => {
      const hash = repository.computeHash('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('create', () => {
    it('should create expert call with computed hash', async () => {
      const mockRow = {
        id: 'test-id',
        engagement_id: 'eng-1',
        status: 'pending',
        transcript: 'Test transcript',
        transcript_hash: repository.computeHash('Test transcript'),
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: 'John Doe',
        interviewee_title: 'CEO',
        source_filename: 'test.txt',
        results: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create({
        engagementId: 'eng-1',
        transcript: 'Test transcript',
        intervieweeName: 'John Doe',
        intervieweeTitle: 'CEO',
        sourceFilename: 'test.txt',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('test-id');
      expect(result.transcriptHash).toBe(repository.computeHash('Test transcript'));
      expect(result.intervieweeName).toBe('John Doe');
    });

    it('should handle optional fields', async () => {
      const mockRow = {
        id: 'test-id',
        engagement_id: 'eng-1',
        status: 'pending',
        transcript: 'Test',
        transcript_hash: repository.computeHash('Test'),
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create({
        engagementId: 'eng-1',
        transcript: 'Test',
      });

      expect(result.intervieweeName).toBeNull();
      expect(result.intervieweeTitle).toBeNull();
      expect(result.sourceFilename).toBeNull();
    });
  });

  describe('findByTranscriptHashes', () => {
    it('should return empty map for empty hashes array', async () => {
      const result = await repository.findByTranscriptHashes('eng-1', []);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should find existing calls by hashes', async () => {
      const hash1 = repository.computeHash('Transcript 1');
      const hash2 = repository.computeHash('Transcript 2');

      const mockRows = [
        {
          id: 'call-1',
          engagement_id: 'eng-1',
          status: 'completed',
          transcript: 'Transcript 1',
          transcript_hash: hash1,
          speaker_labels: {},
          focus_areas: [],
          call_date: null,
          interviewee_name: null,
          interviewee_title: null,
          source_filename: null,
          results: {},
          error_message: null,
          started_at: new Date(),
          completed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await repository.findByTranscriptHashes('eng-1', [hash1, hash2]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.has(hash1)).toBe(true);
      expect(result.has(hash2)).toBe(false);
      expect(result.get(hash1)?.id).toBe('call-1');
    });

    it('should use parameterized query with correct placeholders', async () => {
      const hashes = ['hash1', 'hash2', 'hash3'];
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByTranscriptHashes('eng-1', hashes);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$2, $3, $4'),
        ['eng-1', 'hash1', 'hash2', 'hash3']
      );
    });
  });

  describe('findByTranscriptHash', () => {
    it('should return null when no match found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByTranscriptHash('eng-1', 'New transcript');

      expect(result).toBeNull();
    });

    it('should return existing call when duplicate found', async () => {
      const transcript = 'Existing transcript';
      const mockRow = {
        id: 'existing-call',
        engagement_id: 'eng-1',
        status: 'completed',
        transcript,
        transcript_hash: repository.computeHash(transcript),
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: {},
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findByTranscriptHash('eng-1', transcript);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('existing-call');
    });
  });

  describe('update', () => {
    it('should update status and results', async () => {
      const mockRow = {
        id: 'call-1',
        engagement_id: 'eng-1',
        status: 'completed',
        transcript: 'Test',
        transcript_hash: 'hash',
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: { insights: [] },
        error_message: null,
        started_at: null,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.update('call-1', {
        status: 'completed',
        results: { insights: [] },
        completedAt: new Date(),
      });

      expect(result?.status).toBe('completed');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE expert_calls SET'),
        expect.any(Array)
      );
    });

    it('should return existing record when no updates provided', async () => {
      const mockRow = {
        id: 'call-1',
        engagement_id: 'eng-1',
        status: 'pending',
        transcript: 'Test',
        transcript_hash: 'hash',
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      await repository.update('call-1', {});

      // Should call getById instead of UPDATE
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM expert_calls WHERE id = $1',
        ['call-1']
      );
    });
  });

  describe('markProcessing', () => {
    it('should set status to processing and startedAt', async () => {
      const mockRow = {
        id: 'call-1',
        engagement_id: 'eng-1',
        status: 'processing',
        transcript: 'Test',
        transcript_hash: 'hash',
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: null,
        error_message: null,
        started_at: new Date(),
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.markProcessing('call-1');

      expect(result?.status).toBe('processing');
      expect(result?.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('markCompleted', () => {
    it('should set status to completed with results', async () => {
      const results = { insights: [{ type: 'key_point', content: 'Test' }] };
      const mockRow = {
        id: 'call-1',
        engagement_id: 'eng-1',
        status: 'completed',
        transcript: 'Test',
        transcript_hash: 'hash',
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results,
        error_message: null,
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.markCompleted('call-1', results);

      expect(result?.status).toBe('completed');
      expect(result?.results).toEqual(results);
    });
  });

  describe('markFailed', () => {
    it('should set status to failed with error message', async () => {
      const mockRow = {
        id: 'call-1',
        engagement_id: 'eng-1',
        status: 'failed',
        transcript: 'Test',
        transcript_hash: 'hash',
        speaker_labels: {},
        focus_areas: [],
        call_date: null,
        interviewee_name: null,
        interviewee_title: null,
        source_filename: null,
        results: null,
        error_message: 'LLM API error',
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.markFailed('call-1', 'LLM API error');

      expect(result?.status).toBe('failed');
      expect(result?.errorMessage).toBe('LLM API error');
    });
  });

  describe('delete', () => {
    it('should return true when row deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repository.delete('call-1');

      expect(result).toBe(true);
    });

    it('should return false when no row found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      const mockRow = {
        total: '10',
        pending: '2',
        processing: '1',
        completed: '6',
        failed: '1',
        avg_duration_ms: '5000.5',
        last_call_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.getStats('eng-1');

      expect(result.totalCount).toBe(10);
      expect(result.byStatus.pending).toBe(2);
      expect(result.byStatus.processing).toBe(1);
      expect(result.byStatus.completed).toBe(6);
      expect(result.byStatus.failed).toBe(1);
      expect(result.avgDurationMs).toBeCloseTo(5000.5);
    });

    it('should handle null average duration', async () => {
      const mockRow = {
        total: '0',
        pending: '0',
        processing: '0',
        completed: '0',
        failed: '0',
        avg_duration_ms: null,
        last_call_at: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.getStats('eng-1');

      expect(result.totalCount).toBe(0);
      expect(result.avgDurationMs).toBeNull();
      expect(result.lastCallAt).toBeNull();
    });
  });
});
