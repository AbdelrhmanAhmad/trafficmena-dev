import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/components/ui/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { InvitationService } from '../services/InvitationService';
import type { CreateBulkInvitationsFormData, CreateInvitationFormData } from '../types';

const invitationService = InvitationService.getInstance();

/**
 * Hook for invitation mutations ONLY (no data fetching)
 * Use this in components that only need to create/update/delete invitations
 * without fetching the list
 */
export function useInvitationMutations(callbacks?: {
  onSingleSuccess?: () => void;
  onBulkSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  // Mutation for creating single invitation
  const createSingleInvitationMutation = useMutation({
    mutationFn: ({
      data,
      createdBy,
      customMessage,
    }: {
      data: CreateInvitationFormData;
      createdBy: string;
      customMessage?: string;
    }) => invitationService.createSingleInvitation(data, createdBy, customMessage),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully',
        });
        // More specific invalidation - only invalidate active queries
        queryClient.invalidateQueries({
          queryKey: ['invitations'],
          refetchType: 'active', // Only refetch if query is actively being used
        });

        callbacks?.onSingleSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send invitation',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });

  // Mutation for creating bulk invitations
  const createBulkInvitationsMutation = useMutation({
    mutationFn: ({ data, createdBy }: { data: CreateBulkInvitationsFormData; createdBy: string }) =>
      invitationService.createBulkInvitations(data, createdBy),
    onSuccess: (result) => {
      if (result.success) {
        const { data } = result;
        if (data) {
          toast({
            title: 'Success',
            description: `Bulk invitation created: ${data.invitations.length} invitations created${
              data.failed.length > 0 ? `, ${data.failed.length} failed` : ''
            }`,
          });
        }
        // More specific invalidation
        queryClient.invalidateQueries({
          queryKey: ['invitations'],
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: ['invitation-stats'],
          refetchType: 'active',
        });

        callbacks?.onBulkSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create bulk invitations',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to create bulk invitations',
        variant: 'destructive',
      });
    },
  });

  return {
    createSingleInvitation: createSingleInvitationMutation.mutate,
    createBulkInvitations: createBulkInvitationsMutation.mutate,
    isCreatingSingle: createSingleInvitationMutation.isPending,
    isCreatingBulk: createBulkInvitationsMutation.isPending,
  };
}
