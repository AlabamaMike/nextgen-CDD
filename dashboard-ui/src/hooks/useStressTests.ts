/**
 * React hooks for stress test management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  StressTest,
  StressTestStats,
  StressTestIntensity,
  StressTestStatus,
} from '../types/api';

/**
 * Hook to fetch stress tests for an engagement
 */
export function useStressTests(
  engagementId: string | null,
  filters?: { status?: StressTestStatus; limit?: number }
) {
  return useQuery<{ stressTests: StressTest[]; count: number }>({
    queryKey: ['stressTests', engagementId, filters],
    queryFn: () => apiClient.getStressTests(engagementId!, filters),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch a single stress test
 */
export function useStressTest(engagementId: string | null, stressTestId: string | null) {
  return useQuery<{ stressTest: StressTest }>({
    queryKey: ['stressTest', engagementId, stressTestId],
    queryFn: () => apiClient.getStressTest(engagementId!, stressTestId!),
    enabled: !!engagementId && !!stressTestId,
  });
}

/**
 * Hook to fetch stress test statistics
 */
export function useStressTestStats(engagementId: string | null) {
  return useQuery<{ stats: StressTestStats }>({
    queryKey: ['stressTestStats', engagementId],
    queryFn: () => apiClient.getStressTestStats(engagementId!),
    enabled: !!engagementId,
  });
}

/**
 * Hook to run a stress test
 */
export function useRunStressTest(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (intensity: StressTestIntensity) =>
      apiClient.runStressTest(engagementId, { intensity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stressTests', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['stressTestStats', engagementId] });
    },
  });
}

/**
 * Hook to delete a stress test
 */
export function useDeleteStressTest(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stressTestId: string) =>
      apiClient.deleteStressTest(engagementId, stressTestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stressTests', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['stressTestStats', engagementId] });
    },
  });
}
