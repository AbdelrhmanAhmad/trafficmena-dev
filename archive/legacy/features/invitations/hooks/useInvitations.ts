import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/components/ui/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { InvitationService } from '../services/InvitationService';
import type {
  CreateBulkInvitationsFormData,
  CreateInvitationFormData,
  Invitation,
  InvitationFilters,
  PaginatedInvitations,
  ServiceResponse,
} from '../types';

const invitationService = InvitationService.getInstance();

/**
 * Invitation listing and mutations
 */
export function useInvitations(
  page = 1,
  limit = 10,
  filters?: InvitationFilters,
  callbacks?: {
    onSingleSuccess?: () => void;
    onBulkSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
  },
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const {
    data: invitationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitations', { page, limit, filters }],
    queryFn: () => invitationService.getInvitations(page, limit, filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidateInvitations = () => {
    queryClient.invalidateQueries({
      queryKey: ['invitations'],
      refetchType: 'active',
    });
    queryClient.invalidateQueries({ queryKey: ['invitation-stats'], refetchType: 'active' });
  };

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
        toast({ title: 'Success', description: 'Invitation sent successfully' });
        invalidateInvitations();
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

  const createBulkInvitationsMutation = useMutation({
    mutationFn: ({ data, createdBy }: { data: CreateBulkInvitationsFormData; createdBy: string }) =>
      invitationService.createBulkInvitations(data, createdBy),
    onSuccess: (result) => {
      if (result.success) {
        const { data } = result;
        toast({
          title: 'Success',
          description: data
            ? `Created ${data.invitations.length} invitations${
                data.failed.length ? `, ${data.failed.length} failed` : ''
              }`
            : 'Bulk invitations created successfully',
        });
        invalidateInvitations();
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

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationService.resendInvitation(invitationId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Success', description: 'Invitation resent successfully' });
        invalidateInvitations();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to resend invitation',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => invitationService.cancelInvitation(invitationId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Success', description: 'Invitation cancelled successfully' });
        invalidateInvitations();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel invitation',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => invitationService.deleteInvitation(invitationId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Invitation Deleted' });
        invalidateInvitations();
        callbacks?.onDeleteSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete invitation',
          variant: 'destructive',
        });
        callbacks?.onDeleteError?.();
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to delete invitation',
        variant: 'destructive',
      });
      callbacks?.onDeleteError?.();
    },
  });

  return {
    invitations: invitationsData?.data?.invitations ?? [],
    totalInvitations: invitationsData?.data?.total ?? 0,
    totalPages: invitationsData?.data?.totalPages ?? 1,
    isLoading,
    error,
    hasPermissionError: Boolean(error?.message?.toLowerCase().includes('permission')),
    refetch,
    createSingleInvitation: createSingleInvitationMutation.mutate,
    createBulkInvitations: createBulkInvitationsMutation.mutate,
    resendInvitation: resendInvitationMutation.mutate,
    cancelInvitation: cancelInvitationMutation.mutate,
    deleteInvitation: deleteInvitationMutation.mutateAsync,
    isResending: resendInvitationMutation.isPending,
    isDeleting: deleteInvitationMutation.isPending,
  };
}

export function useInvitation(invitationId: string) {
  return useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: async () => {
      const result = await invitationService.getInvitations(1, 100);
      if (result.success && result.data) {
        const invitation = result.data.invitations.find((inv) => inv.id === invitationId) ?? null;
        return { success: true, data: invitation } as ServiceResponse<Invitation | null>;
      }
      return result as ServiceResponse<Invitation | null>;
    },
    enabled: Boolean(invitationId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvitationByToken(token: string) {
  return useQuery({
    queryKey: ['invitation-token', token],
    queryFn: () => invitationService.getInvitationByToken(token),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) =>
      invitationService.acceptInvitation(token, userId),
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Welcome!', description: 'Your invitation has been accepted successfully' });
        queryClient.invalidateQueries({ queryKey: ['invitation-token'] });
        queryClient.invalidateQueries({ queryKey: ['invitations'] });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to accept invitation',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
    },
  });
}
