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
    onSuccess: (_data, variables) => {
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
    refetchInterval: (query) => {
      // Poll every 2 seconds if job is still running
      const status = query.state?.data?.status;
      if (status === 'pending' || status === 'running') {
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

    const wsUrl = apiClient.getResearchProgressWsUrl(jobId, 'dev-token');
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle wrapped messages from backend
        if (message.type === 'progress' && message.payload) {
          setEvents((prev) => [...prev, message.payload as ProgressEvent]);
        } else if (message.type === 'connected') {
          // Optional: Add a system event for connection
          /* 
          setEvents((prev) => [...prev, {
            type: 'status_update',
            jobId: message.payload.jobId,
            timestamp: message.payload.timestamp,
            data: { status: 'connected' },
            message: 'Connected to research stream'
          } as ProgressEvent]);
          */
          console.log('Research stream connected:', message.payload);
        } else if (message.type === 'error') {
          console.error('Research stream error:', message.payload);
        } else {
          // Fallback for direct events (legacy/dev)
          // Only add if it looks like a valid event with timestamp
          if (message.timestamp) {
            setEvents((prev) => [...prev, message as ProgressEvent]);
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    websocket.onerror = (event) => {
      setError(new Error('WebSocket error occurred'));
      console.error('WebSocket connection failed:', {
        url: wsUrl,
        readyState: websocket.readyState,
        event
      });
    };

    websocket.onclose = (event) => {
      if (event.code !== 1000) {
        console.error('WebSocket closed abnormally:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
      }
      setIsConnected(false);
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
