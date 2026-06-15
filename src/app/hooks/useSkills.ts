import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addUserSkill,
  createSkill,
  fetchSkills,
  fetchUserSkills,
  removeUserSkill,
  type SkillRecord,
} from '@/app/api/skills';

const skillsQueryKey = ['skills'];
const userSkillsQueryKey = ['user-skills'];

export function useSkills() {
  return useQuery({
    queryKey: skillsQueryKey,
    queryFn: (): Promise<SkillRecord[]> => fetchSkills(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUserSkills() {
  return useQuery({
    queryKey: userSkillsQueryKey,
    queryFn: () => fetchUserSkills(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillsQueryKey });
    },
  });
}

export function useAddUserSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addUserSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSkillsQueryKey });
    },
  });
}

export function useRemoveUserSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUserSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSkillsQueryKey });
    },
  });
}
