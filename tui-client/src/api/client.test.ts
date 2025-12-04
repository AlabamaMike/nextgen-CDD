import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ThesisValidatorClient } from './client.js';

vi.mock('axios');

describe('ThesisValidatorClient', () => {
  let client: ThesisValidatorClient;
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    client = new ThesisValidatorClient('http://localhost:3000');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with base URL', () => {
    expect(client).toBeDefined();
    expect(client.baseURL).toBe('http://localhost:3000');
  });

  it('should fetch health status', async () => {
    const mockHealth = {
      status: 'healthy' as const,
      timestamp: Date.now(),
      version: '1.0.0',
    };

    mockAxiosInstance.get.mockResolvedValueOnce({ data: mockHealth });

    const health = await client.getHealth();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
    expect(health.status).toBe('healthy');
    expect(health.version).toBe('1.0.0');
  });

  it('should fetch engagements', async () => {
    const mockEngagements = [
      {
        id: 'eng-1',
        name: 'Test Deal',
        target: { name: 'TechCo', sector: 'Software' },
        deal_type: 'buyout' as const,
        status: 'pending' as const,
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: 'user-1',
      },
    ];

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { engagements: mockEngagements },
    });

    const engagements = await client.getEngagements();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/engagements', {
      params: undefined,
    });
    expect(engagements).toHaveLength(1);
    expect(engagements[0]?.name).toBe('Test Deal');
  });
});
