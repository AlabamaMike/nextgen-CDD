/**
 * React Hooks for research workflow operations
 */
import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ResearchJob, ResearchConfig, ProgressEvent } from '../types/api';

interface StartResearchParams {
  engagementId: string;
  thesis: string;
  config?: ResearchConfig;
}

/**
 * Hook to start a new research job
 */
export function useStartResearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ engagementId, thesis, config }: StartResearchParams) =>
      apiClient.startResearch(engagementId, thesis, config),
    onSuccess: (data, variables) => {
      // Invalidate engagements to refetch with updated data
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['engagement', variables.engagementId] });
    },
  });
}

/**
 * Hook to fetch a specific research job
 */
export function useResearchJob(engagementId: string | null, jobId: string | null) {
  return useQuery<ResearchJob>({
    queryKey: ['researchJob', engagementId, jobId],
    queryFn: () => apiClient.getResearchJob(engagementId!, jobId!),
    enabled: !!engagementId && !!jobId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if job is still running
      if (data?.status === 'pending' || data?.status === 'running') {
        return 2000;
      }
      return false;
    },
  });
}

interface UseResearchProgressReturn {
  events: ProgressEvent[];
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for WebSocket real-time progress updates
 */
export function useResearchProgress(jobId: string | null): UseResearchProgressReturn {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!jobId || ws) return;

    const wsUrl = apiClient.getResearchProgressWsUrl(jobId);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const progressEvent = JSON.parse(event.data) as ProgressEvent;
        setEvents((prev) => [...prev, progressEvent]);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    websocket.onerror = (event) => {
      setError(new Error('WebSocket error occurred'));
      console.error('WebSocket error:', event);
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    setWs(websocket);
  }, [jobId, ws]);

  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  }, [ws]);

  // Auto-connect when jobId becomes available
  useEffect(() => {
    if (jobId && !ws) {
      connect();
    }

    // Cleanup on unmount or when jobId changes
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [jobId, ws, connect]);

  return {
    events,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
