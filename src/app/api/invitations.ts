import { API_BASE, fetchJson } from './client';
import type { PaginatedResult } from './types';

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'failed';
export type InvitationSource = 'single' | 'csv';

export type InvitationRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: InvitationStatus;
  source: InvitationSource;
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  acceptedUserId: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  customMessage: string | null;
};

export type FetchInvitationsParams = {
  page?: number;
  pageSize?: number;
  status?: InvitationStatus;
  search?: string;
};

export type CreateInvitationPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  customMessage?: string;
};

export type AcceptInvitationPayload = {
  token: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type ActivateInvitationPayload = {
  token: string;
  email: string;
};

export async function fetchInvitations(
  params: FetchInvitationsParams = {},
): Promise<PaginatedResult<InvitationRecord>> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const data = await fetchJson<{
    items: InvitationRecord[];
    pagination: PaginatedResult<InvitationRecord>['pagination'];
  }>(`${API_BASE}/invitations${query.toString() ? `?${query.toString()}` : ''}`, {
    method: 'GET',
  });

  return {
    items: data.items ?? [],
    pagination: data.pagination,
  };
}

export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<{ invitation: InvitationRecord }> {
  return fetchJson<{ invitation: InvitationRecord }>(`${API_BASE}/invitations/single`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type AcceptInvitationResponse = {
  invitation: InvitationRecord;
  alreadyAccepted: boolean;
  userId?: string;
  userCreated?: boolean;
};

export async function acceptInvitation(
  payload: AcceptInvitationPayload,
): Promise<AcceptInvitationResponse> {
  return fetchJson<AcceptInvitationResponse>(`${API_BASE}/invitations/${payload.token}/accept`, {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    }),
  });
}

export async function activateInvitation(
  payload: ActivateInvitationPayload,
): Promise<{ invitation: InvitationRecord; alreadyActivated: boolean }> {
  return fetchJson<{ invitation: InvitationRecord; alreadyActivated: boolean }>(
    `${API_BASE}/invitations/${payload.token}/activate`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
      }),
    },
  );
}

export type BulkInvitationResponse = {
  created: InvitationRecord[];
  errors: Array<{ line: number; email: string; reason: string }>;
};

export async function createInvitationsFromCsv(file: File): Promise<BulkInvitationResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/invitations/bulk`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok) {
    if (isJson) {
      const payload = await response.json();
      throw new Error(payload?.error?.message ?? response.statusText);
    }
    throw new Error(response.statusText);
  }

  return (isJson ? response.json() : Promise.resolve(undefined)) as Promise<BulkInvitationResponse>;
}
