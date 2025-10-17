import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AcceptInvitationPayload,
  type AcceptInvitationResponse,
  acceptInvitation,
  type CreateInvitationPayload,
  createInvitation,
  type FetchInvitationsParams,
  fetchInvitations,
  createInvitationsFromCsv,
  type InvitationRecord,
  type BulkInvitationResponse,
} from '@/app/api/invitations';

const invitationQueryKey = (params: FetchInvitationsParams) =>
  ['admin', 'invitations', params] as const;

export function useInvitations(params: FetchInvitationsParams) {
  return useQuery({
    queryKey: invitationQueryKey(params),
    queryFn: () => fetchInvitations(params),
    staleTime: 60 * 1000,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(payload),
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

export function useBulkInvitations() {
  const queryClient = useQueryClient();
  return useMutation<BulkInvitationResponse, Error, File>({
    mutationFn: (file: File) => createInvitationsFromCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation<AcceptInvitationResponse, Error, AcceptInvitationPayload>({
    mutationFn: (payload: AcceptInvitationPayload) => acceptInvitation(payload),
  });
}

export function mapInvitationName(invite: InvitationRecord): string {
  const bits = [invite.firstName?.trim(), invite.lastName?.trim()].filter(Boolean);
  if (bits.length > 0) return bits.join(' ');
  return '';
}
