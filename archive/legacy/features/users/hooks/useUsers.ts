import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useToast } from '@/shared/hooks/custom/use-toast';
import type { ActivityData, ActivityType } from '@/types';
import { UserService } from '../services/UserService';
import type { ProfileUpdateData, UserFilters } from '../types';

export const useUsers = (page: number, itemsPerPage: number, filters?: UserFilters) => {
  return useQuery({
    queryKey: ['admin', 'users', page, itemsPerPage, filters],
    queryFn: () => UserService.getInstance().getUsers(page, itemsPerPage, filters),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => UserService.getInstance().getUserById(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};

export const useUserSkills = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId, 'skills'],
    queryFn: () => UserService.getInstance().getUserSkills(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};

export const useUserActivity = (userId: string, limit?: number) => {
  return useQuery({
    queryKey: ['user', userId, 'activity', limit],
    queryFn: () => UserService.getInstance().getUserActivity(userId, limit),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};

export const useUserEngagement = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId, 'engagement'],
    queryFn: () => UserService.getInstance().getUserEngagement(userId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};

export const useSearchUsers = (query: string, limit?: number) => {
  // State for debounced query value
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce effect with 400ms delay to prevent rapid requests
  useEffect(() => {
    // Only debounce if query meets minimum requirements
    if (query && query.length >= 2) {
      const handler = setTimeout(() => {
        setDebouncedQuery(query);
      }, 400);

      return () => {
        clearTimeout(handler);
      };
    } else if (!query || query.length < 2) {
      // Immediately clear for empty/short queries to maintain responsiveness
      setDebouncedQuery(query);
    }
  }, [query]);

  return useQuery({
    queryKey: ['admin', 'users', 'search', debouncedQuery, limit],
    queryFn: () => UserService.getInstance().searchUsers(debouncedQuery, limit),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });
};

export const useUserStatistics = () => {
  return useQuery({
    queryKey: ['admin', 'users', 'statistics'],
    queryFn: () => UserService.getInstance().getUserStatistics(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Mutations
export const useUpdateUserProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ProfileUpdateData }) =>
      UserService.getInstance().updateUserProfile(userId, data),
    onSuccess: (profile, variables) => {
      if (profile) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
        });

        queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      }
    },
    onError: (error) => {
      console.error('Update profile error:', error?.message || 'Unknown error');
      toast({
        title: 'Update Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateUserRole = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      UserService.getInstance().updateUserRole(userId, role),
    onSuccess: (success, variables) => {
      if (success) {
        toast({
          title: 'Role Updated',
          description: `User role has been updated to ${variables.role}.`,
        });

        queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        queryClient.invalidateQueries({
          queryKey: ['admin', 'users', 'statistics'],
        });
      }
    },
    onError: (error) => {
      console.error('Update role error:', error?.message || 'Unknown error');
      toast({
        title: 'Role Update Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useAddUserSkill = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      skillId,
      proficiencyLevel,
    }: {
      userId: string;
      skillId: string;
      proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }) => UserService.getInstance().addUserSkill(userId, skillId, proficiencyLevel),
    onSuccess: (skill, variables) => {
      if (skill) {
        toast({
          title: 'Skill Added',
          description: 'Skill has been added to your profile.',
        });

        queryClient.invalidateQueries({
          queryKey: ['user', variables.userId, 'skills'],
        });
      }
    },
    onError: (error) => {
      console.error('Add skill error:', error?.message || 'Unknown error');
      toast({
        title: 'Add Skill Error',
        description: 'Failed to add skill. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveUserSkill = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, skillId }: { userId: string; skillId: string }) =>
      UserService.getInstance().removeUserSkill(userId, skillId),
    onSuccess: (success, variables) => {
      if (success) {
        toast({
          title: 'Skill Removed',
          description: 'Skill has been removed from your profile.',
        });

        queryClient.invalidateQueries({
          queryKey: ['user', variables.userId, 'skills'],
        });
      }
    },
    onError: (error) => {
      console.error('Remove skill error:', error?.message || 'Unknown error');
      toast({
        title: 'Remove Skill Error',
        description: 'Failed to remove skill. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeactivateUser = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => UserService.getInstance().deactivateUser(userId),
    onSuccess: () => {
      toast({
        title: 'User Deactivated',
        description: 'User has been deactivated successfully.',
      });

      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'users', 'statistics'],
      });
    },
    onError: (error) => {
      console.error('Deactivate user error:', error?.message || 'Unknown error');
      toast({
        title: 'Deactivation Error',
        description: 'Failed to deactivate user. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useRecordActivity = () => {
  return useMutation({
    mutationFn: ({
      userId,
      activityType,
      activityData,
      ipAddress,
      userAgent,
    }: {
      userId: string;
      activityType: ActivityType;
      activityData: ActivityData;
      ipAddress?: string;
      userAgent?: string;
    }) =>
      UserService.getInstance().recordUserActivity(
        userId,
        activityType,
        activityData,
        ipAddress,
        userAgent,
      ),
    onSuccess: () => {
      // Silently record activity - no need for user feedback
    },
    onError: (error) => {
      console.error('Record activity error:', error?.message || 'Unknown error');
      // Don't show error to user for activity logging failures
    },
  });
};
