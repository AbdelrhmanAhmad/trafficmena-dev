import { API_BASE, ApiError, fetchJson } from './client';

export type PublicSettings = {
  inviteOnly: boolean;
};

export async function fetchPublicSettings(): Promise<PublicSettings> {
  return fetchJson<PublicSettings>(`${API_BASE}/settings/public`, {
    method: 'GET',
  });
}

export type AdminSettings = {
  inviteOnly: boolean;
  eventMode: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function fetchAdminSettings(): Promise<AdminSettings> {
  return fetchJson<AdminSettings>(`${API_BASE}/admin/settings/general`, {
    method: 'GET',
  });
}

export async function updateAdminSettings(payload: {
  inviteOnly?: boolean;
  eventMode?: boolean;
}): Promise<AdminSettings> {
  try {
    return await fetchJson<AdminSettings>(`${API_BASE}/admin/settings/general`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Unable to update settings.', 500);
  }
}
