/**
 * React hooks for evidence and document management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  Evidence,
  EvidenceStats,
  EvidenceFilters,
  CreateEvidenceRequest,
  UpdateEvidenceRequest,
  Document,
  DocumentFilters,
} from '../types/api';

/**
 * Hook to fetch evidence list for an engagement
 */
export function useEvidence(engagementId: string | null, filters?: EvidenceFilters) {
  return useQuery<{ evidence: Evidence[]; total: number }>({
    queryKey: ['evidence', engagementId, filters],
    queryFn: () => apiClient.getEvidence(engagementId!, filters),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch evidence statistics
 */
export function useEvidenceStats(engagementId: string | null) {
  return useQuery<{ stats: EvidenceStats }>({
    queryKey: ['evidenceStats', engagementId],
    queryFn: () => apiClient.getEvidenceStats(engagementId!),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch a single evidence item
 */
export function useEvidenceById(engagementId: string | null, evidenceId: string | null) {
  return useQuery<{ evidence: Evidence }>({
    queryKey: ['evidence', engagementId, evidenceId],
    queryFn: () => apiClient.getEvidenceById(engagementId!, evidenceId!),
    enabled: !!engagementId && !!evidenceId,
  });
}

/**
 * Hook to create evidence
 */
export function useCreateEvidence(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvidenceRequest) =>
      apiClient.createEvidence(engagementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['evidenceStats', engagementId] });
    },
  });
}

/**
 * Hook to update evidence
 */
export function useUpdateEvidence(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, data }: { evidenceId: string; data: UpdateEvidenceRequest }) =>
      apiClient.updateEvidence(engagementId, evidenceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId, variables.evidenceId] });
      queryClient.invalidateQueries({ queryKey: ['evidenceStats', engagementId] });
    },
  });
}

/**
 * Hook to delete evidence
 */
export function useDeleteEvidence(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evidenceId: string) =>
      apiClient.deleteEvidence(engagementId, evidenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['evidenceStats', engagementId] });
    },
  });
}

/**
 * Hook to link evidence to hypothesis
 */
export function useLinkEvidenceToHypothesis(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      hypothesisId,
      relevanceScore,
    }: {
      evidenceId: string;
      hypothesisId: string;
      relevanceScore?: number;
    }) => apiClient.linkEvidenceToHypothesis(engagementId, evidenceId, hypothesisId, relevanceScore),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId, variables.evidenceId] });
    },
  });
}

/**
 * Hook to unlink evidence from hypothesis
 */
export function useUnlinkEvidenceFromHypothesis(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, hypothesisId }: { evidenceId: string; hypothesisId: string }) =>
      apiClient.unlinkEvidenceFromHypothesis(engagementId, evidenceId, hypothesisId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId, variables.evidenceId] });
    },
  });
}

// Document hooks

/**
 * Hook to fetch documents for an engagement
 */
export function useDocuments(engagementId: string | null, filters?: DocumentFilters) {
  return useQuery<{ documents: Document[]; total: number }>({
    queryKey: ['documents', engagementId, filters],
    queryFn: () => apiClient.getDocuments(engagementId!, filters),
    enabled: !!engagementId,
  });
}

/**
 * Hook to fetch a single document
 */
export function useDocument(engagementId: string | null, documentId: string | null) {
  return useQuery<{ document: Document }>({
    queryKey: ['document', engagementId, documentId],
    queryFn: () => apiClient.getDocument(engagementId!, documentId!),
    enabled: !!engagementId && !!documentId,
  });
}

/**
 * Hook to upload a document
 */
export function useUploadDocument(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => apiClient.uploadDocument(engagementId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', engagementId] });
    },
  });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => apiClient.deleteDocument(engagementId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', engagementId] });
      queryClient.invalidateQueries({ queryKey: ['evidenceStats', engagementId] });
    },
  });
}
