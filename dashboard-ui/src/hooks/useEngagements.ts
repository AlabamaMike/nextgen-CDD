/**
 * React Hook for fetching engagements from the backend
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { Engagement } from '../types/api';

interface EngagementsResponse {
  engagements: Engagement[];
  total: number;
  limit: number;
  offset: number;
}

export function useEngagements(filters?: { status?: string; sector?: string }) {
  return useQuery<EngagementsResponse>({
    queryKey: ['engagements', filters],
    queryFn: () => apiClient.getEngagements(filters),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

export function useEngagement(id: string | null) {
  return useQuery({
    queryKey: ['engagement', id],
    queryFn: () => apiClient.getEngagement(id!),
    enabled: !!id, // Only fetch if ID is provided
  });
}

/**
 * Hook to create a new engagement
 */
export function useCreateEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createEngagement(data),
    onSuccess: () => {
      // Invalidate and refetch engagements list
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
  });
}

/**
 * Hook to update an existing engagement
 */
export function useUpdateEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.updateEngagement(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the list and the specific engagement
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['engagement', variables.id] });
    },
  });
}

/**
 * Hook to delete an engagement
 */
export function useDeleteEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteEngagement(id),
    onSuccess: () => {
      // Invalidate engagements list
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
  });
}
