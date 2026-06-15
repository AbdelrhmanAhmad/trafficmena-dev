import { API_BASE, fetchJson, getCsrfHeaders } from './client';
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

export type InvitationStats = {
  total: number;
  pending: number;
  sent: number;
  accepted: number;
  expired: number;
  failed: number;
  activated: number;
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
  const normalizedSearch = params.search?.trim();
  if (normalizedSearch) query.set('search', normalizedSearch);

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

export async function fetchInvitationStats(): Promise<InvitationStats> {
  const data = await fetchJson<{ stats: InvitationStats }>(`${API_BASE}/invitations/stats`, {
    method: 'GET',
  });
  return data.stats;
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

export type ActivateInvitationResponse = {
  invitation: InvitationRecord;
  alreadyActivated: boolean;
  sessionCreated: boolean;
  userId?: string;
};

export async function activateInvitation(
  payload: ActivateInvitationPayload,
): Promise<ActivateInvitationResponse> {
  return fetchJson<ActivateInvitationResponse>(
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
    headers: getCsrfHeaders(),
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
