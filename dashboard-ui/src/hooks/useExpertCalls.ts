/**
 * React hooks for expert call management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  ExpertCall,
  ExpertCallStats,
  ExpertCallStatus,
  ProcessTranscriptRequest,
} from '../types/api';

/**
 * Hook to fetch expert calls for an engagement
 */
export function useExpertCalls(
  engagementId: string | null,
  filters?: { status?: ExpertCallStatus; limit?: number }
) {
  return useQuery<{ expertCalls: ExpertCall[]; count: number }>({
    queryKey: ['expertCalls', engagementId, filters],
    queryFn: () => apiClient.getExpertCalls(engagementId!, filters),
    enabled: !!engagementId,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    // Poll every 3 seconds if there are any processing calls
    refetchInterval: (query) => {
      const calls = query.state.data?.expertCalls;
      const hasProcessing = calls?.some(
        (call) => call.status === 'processing' || call.status === 'pending'
      );
      return hasProcessing ? 3000 : false;
    },
  });
}

/**
 * Hook to fetch a single expert call
 */
export function useExpertCall(engagementId: string | null, callId: string | null) {
  return useQuery<{ expertCall: ExpertCall }>({
    queryKey: ['expertCall', engagementId, callId],
    queryFn: () => apiClient.getExpertCall(engagementId!, callId!),
    enabled: !!engagementId && !!callId,
    // Poll for updates while processing
    refetchInterval: (query) => {
      const call = query.state.data?.expertCall;
      if (call?.status === 'processing' || call?.status === 'pending') {
        return 3000; // Poll every 3 seconds while processing
      }
      return false;
    },
  });
}

/**
 * Hook to fetch expert call statistics
 */
export function useExpertCallStats(engagementId: string | null) {
  return useQuery<{ stats: ExpertCallStats }>({
    queryKey: ['expertCallStats', engagementId],
    queryFn: () => apiClient.getExpertCallStats(engagementId!),
    enabled: !!engagementId,
  });
}

/**
 * Hook to process a transcript
 */
export function useProcessTranscript(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessTranscriptRequest) =>
      apiClient.processTranscript(engagementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expertCalls', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['expertCallStats', engagementId] });
    },
  });
}

/**
 * Batch transcript request type
 */
interface BatchTranscriptRequest {
  transcripts: Array<{
    transcript: string;
    filename?: string;
    callDate?: string;
    intervieweeName?: string;
    intervieweeTitle?: string;
  }>;
  focusAreas?: string[];
}

/**
 * Hook to process multiple transcripts in batch
 */
export function useProcessTranscriptBatch(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchTranscriptRequest) =>
      apiClient.processTranscriptBatch(engagementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expertCalls', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['expertCallStats', engagementId] });
    },
  });
}

/**
 * Hook to delete an expert call
 */
export function useDeleteExpertCall(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) =>
      apiClient.deleteExpertCall(engagementId, callId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expertCalls', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['expertCallStats', engagementId] });
    },
  });
}
