import { API_BASE, fetchJson } from './client';

export type ExpertPublicRecord = {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
};

export type ExpertAdminRecord = {
  id: string;
  slug: string;
  displayNameEn: string;
  displayNameAr: string;
  headlineEn: string | null;
  headlineAr: string | null;
  bioEn: string | null;
  bioAr: string | null;
  avatarUrl: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  assignedUserId: string | null;
  assignedUserEmail?: string | null;
};

export type ExpertPayload = {
  slug?: string;
  displayNameEn: string;
  displayNameAr: string;
  headlineEn?: string | null;
  headlineAr?: string | null;
  bioEn?: string | null;
  bioAr?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  assignedUserId?: string | null;
  isPublished?: boolean;
  skillIds?: string[];
};

export async function fetchExpertsPublic(): Promise<ExpertPublicRecord[]> {
  const response = await fetchJson<{ items: ExpertPublicRecord[] }>(`${API_BASE}/experts`, {
    method: 'GET',
  });
  return response.items ?? [];
}

export async function fetchExpertsAdmin(): Promise<ExpertAdminRecord[]> {
  const response = await fetchJson<{ items: ExpertAdminRecord[] }>(`${API_BASE}/experts`, {
    method: 'GET',
    credentials: 'include',
  });
  return response.items ?? [];
}

export async function fetchExpertBySlug(slug: string) {
  return fetchJson<{
    expert: ExpertPublicRecord | ExpertAdminRecord;
    skills: Array<{ id: string; name: string; category: string | null }>;
    events: Array<{ id: string; title: string; date: string; imageUrl: string | null }>;
    tracks: Array<{ id: string; title: string; imageUrl: string | null }>;
    series: Array<{ id: string; title: string; imageUrl: string | null }>;
    masterclasses: Array<{ id: string; title: string; imageUrl: string | null }>;
    libraryAssets: Array<{ id: string; title: string; imageUrl: string | null }>;
  }>(`${API_BASE}/experts/s/${encodeURIComponent(slug)}`, { method: 'GET' });
}

export async function fetchExpertAdmin(id: string) {
  return fetchJson<{ expert: ExpertAdminRecord; skillIds: string[] }>(
    `${API_BASE}/experts/${id}`,
    { method: 'GET', credentials: 'include' },
  );
}

export async function createExpert(payload: ExpertPayload) {
  return fetchJson<{ expert: ExpertAdminRecord }>(`${API_BASE}/experts`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export async function updateExpert(id: string, payload: Partial<ExpertPayload>) {
  return fetchJson<{ expert: ExpertAdminRecord }>(`${API_BASE}/experts/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export async function publishExpert(id: string) {
  return fetchJson(`${API_BASE}/experts/${id}/publish`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function unpublishExpert(id: string) {
  return fetchJson(`${API_BASE}/experts/${id}/unpublish`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function archiveExpert(id: string) {
  return fetchJson(`${API_BASE}/experts/${id}/archive`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function restoreExpert(id: string) {
  return fetchJson(`${API_BASE}/experts/${id}/restore`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function assignExpertUser(id: string, assignedUserId: string | null) {
  return fetchJson(`${API_BASE}/experts/${id}/assign-user`, {
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify({ assignedUserId }),
  });
}

export async function deleteExpertPermanent(id: string) {
  return fetchJson(`${API_BASE}/experts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function fetchMyExpertProfile() {
  return fetchJson<{ expert: ExpertAdminRecord; skillIds: string[]; canEdit: boolean }>(
    `${API_BASE}/me/expert-profile`,
    { method: 'GET', credentials: 'include' },
  );
}

export async function updateMyExpertProfile(payload: Partial<ExpertPayload>) {
  return fetchJson<{ expert: ExpertAdminRecord }>(`${API_BASE}/me/expert-profile`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}
