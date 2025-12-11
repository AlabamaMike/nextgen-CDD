/**
 * React hooks for research metrics
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ResearchMetrics, MetricHistory, MetricType } from '../types/api';

/**
 * Hook to fetch current metrics for an engagement
 */
export function useMetrics(engagementId: string | null) {
  return useQuery<{ metrics: ResearchMetrics }>({
    queryKey: ['metrics', engagementId],
    queryFn: () => apiClient.getMetrics(engagementId!),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch metric history for an engagement
 */
export function useMetricHistory(
  engagementId: string | null,
  metricType?: MetricType,
  limit?: number
) {
  return useQuery<{ history: MetricHistory[] }>({
    queryKey: ['metricHistory', engagementId, metricType, limit],
    queryFn: () => apiClient.getMetricHistory(engagementId!, metricType, limit),
    enabled: !!engagementId,
  });
}

/**
 * Hook to recalculate metrics for an engagement
 */
export function useCalculateMetrics(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.calculateMetrics(engagementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['metricHistory', engagementId] });
    },
  });
}
