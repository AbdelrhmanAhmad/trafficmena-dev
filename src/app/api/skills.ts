import { API_BASE, fetchJson } from './client';

type ApiSkill = {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  category: string | null;
  description: string | null;
};

export type SkillRecord = ApiSkill;

export async function fetchSkills(): Promise<SkillRecord[]> {
  const response = await fetchJson<{ items: ApiSkill[] }>(`${API_BASE}/skills`, {
    method: 'GET',
  });
  return response.items ?? [];
}

export async function createSkill(payload: {
  nameEn: string;
  nameAr: string;
  category?: string;
  description?: string;
}): Promise<{ success: boolean; skill?: SkillRecord; error?: { code: string; message: string } }> {
  return fetchJson(`${API_BASE}/skills`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSkill(
  id: string,
  payload: {
    nameEn: string;
    nameAr: string;
    category?: string | null;
    description?: string | null;
  },
): Promise<{ success: boolean; skill?: SkillRecord }> {
  return fetchJson(`${API_BASE}/skills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSkill(id: string): Promise<{ success: boolean }> {
  return fetchJson(`${API_BASE}/skills/${id}`, {
    method: 'DELETE',
  });
}

type ApiUserSkill = {
  skillId: string;
  name: string;
  category: string | null;
};

export async function fetchUserSkills(): Promise<ApiUserSkill[]> {
  const response = await fetchJson<{ items: ApiUserSkill[] }>(`${API_BASE}/user/skills`, {
    method: 'GET',
  });
  return response.items ?? [];
}

export async function addUserSkill(
  skillId: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson(`${API_BASE}/user/skills`, {
    method: 'POST',
    body: JSON.stringify({ skillId }),
  });
}

export async function removeUserSkill(
  skillId: string,
): Promise<{ success: boolean; message?: string }> {
  return fetchJson(`${API_BASE}/user/skills/${skillId}`, {
    method: 'DELETE',
  });
}
