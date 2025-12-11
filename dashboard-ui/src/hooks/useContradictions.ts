/**
 * React hooks for contradiction management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  Contradiction,
  ContradictionStats,
  ContradictionFilters,
  CreateContradictionRequest,
  ResolveContradictionRequest,
} from '../types/api';

/**
 * Hook to fetch contradictions for an engagement
 */
export function useContradictions(engagementId: string | null, filters?: ContradictionFilters) {
  return useQuery<{ contradictions: Contradiction[]; total: number }>({
    queryKey: ['contradictions', engagementId, filters],
    queryFn: () => apiClient.getContradictions(engagementId!, filters),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch a single contradiction
 */
export function useContradiction(engagementId: string | null, contradictionId: string | null) {
  return useQuery<{ contradiction: Contradiction }>({
    queryKey: ['contradiction', engagementId, contradictionId],
    queryFn: () => apiClient.getContradiction(engagementId!, contradictionId!),
    enabled: !!engagementId && !!contradictionId,
  });
}

/**
 * Hook to fetch contradiction statistics
 */
export function useContradictionStats(engagementId: string | null) {
  return useQuery<{ stats: ContradictionStats }>({
    queryKey: ['contradictionStats', engagementId],
    queryFn: () => apiClient.getContradictionStats(engagementId!),
    enabled: !!engagementId,
  });
}

/**
 * Hook to create a contradiction
 */
export function useCreateContradiction(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContradictionRequest) =>
      apiClient.createContradiction(engagementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contradictions', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['contradictionStats', engagementId] });
    },
  });
}

/**
 * Hook to resolve a contradiction
 */
export function useResolveContradiction(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contradictionId,
      data,
    }: {
      contradictionId: string;
      data: ResolveContradictionRequest;
    }) => apiClient.resolveContradiction(engagementId, contradictionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contradictions', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['contradictionStats', engagementId] });
    },
  });
}

/**
 * Hook to mark a contradiction as critical
 */
export function useMarkContradictionCritical(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contradictionId: string) =>
      apiClient.markContradictionCritical(engagementId, contradictionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contradictions', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['contradictionStats', engagementId] });
    },
  });
}

/**
 * Hook to delete a contradiction
 */
export function useDeleteContradiction(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contradictionId: string) =>
      apiClient.deleteContradiction(engagementId, contradictionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contradictions', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['contradictionStats', engagementId] });
    },
  });
}
