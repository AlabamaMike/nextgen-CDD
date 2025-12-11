/**
 * React hooks for skill library management
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  Skill,
  SkillCategory,
  SkillExecutionRequest,
  SkillExecutionResult,
} from '../types/api';

/**
 * Hook to fetch skills from the library
 */
export function useSkills(filters?: {
  category?: SkillCategory;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<{ skills: Skill[]; total: number }>({
    queryKey: ['skills', filters],
    queryFn: () => apiClient.getSkills(filters),
  });
}

/**
 * Hook to fetch a single skill
 */
export function useSkill(skillId: string | null) {
  return useQuery<{ skill: Skill }>({
    queryKey: ['skill', skillId],
    queryFn: () => apiClient.getSkill(skillId!),
    enabled: !!skillId,
  });
}

/**
 * Hook to execute a skill
 */
export function useExecuteSkill(skillId: string) {
  return useMutation<SkillExecutionResult, Error, SkillExecutionRequest>({
    mutationFn: (data: SkillExecutionRequest) =>
      apiClient.executeSkill(skillId, data),
  });
}
