import { API_BASE, fetchJson } from './client';

export type CommunityChannelType = 'staff_post' | 'entitlement_gated' | 'open';

export type CommunityChannel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  channelType: CommunityChannelType;
  coverImageUrl: string;
  requiresApproval: boolean;
  sortOrder: number;
  archivedAt?: string | null;
};

export type CommunityPostAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CommunityPost = {
  id: string;
  channelId: string;
  title: string | null;
  bodyHtml: string;
  dir: 'rtl' | 'ltr' | 'auto';
  linkUrl: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: CommunityPostAuthor;
  status?: string;
  archivedAt?: string | null;
};

export type CommunityAnnouncement = {
  id: string;
  channelId: string | null;
  title: string;
  body: string;
  publishedAt: string | null;
  isAnnouncement: true;
  status?: string;
  scheduledAt?: string | null;
  cancelledAt?: string | null;
  archivedAt?: string | null;
};

export type AdminCommunityChannel = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  channelType: CommunityChannelType;
  coverImageUrl: string;
  requiresApproval: boolean;
  sortOrder: number;
  archivedAt: string | null;
  entitlements: Array<{ trackId: string | null; masterclassId: string | null }>;
};

export type AdminCommunityAnnouncement = {
  id: string;
  channelId: string | null;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  archivedAt: string | null;
};

export type ChannelPayload = {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  channelType: CommunityChannelType;
  coverImageUrl: string;
  requiresApproval?: boolean;
  sortOrder?: number;
  slug?: string;
  entitlements?: Array<{ trackId?: string | null; masterclassId?: string | null }>;
};

export type PostPayload = {
  title?: string | null;
  bodyHtml: string;
  localeHint?: 'en' | 'ar' | null;
  linkUrl?: string | null;
  imageUrl?: string | null;
  status?: 'draft' | 'published';
};

export type AnnouncementPayload = {
  channelId?: string | null;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
};

export async function fetchCommunityChannels(): Promise<CommunityChannel[]> {
  const data = await fetchJson<{ items: CommunityChannel[] }>(`${API_BASE}/community/channels`, {
    method: 'GET',
    credentials: 'include',
  });
  return data.items ?? [];
}

export async function fetchCommunityChannel(slug: string) {
  return fetchJson<{ channel: CommunityChannel; canPost: boolean }>(
    `${API_BASE}/community/channels/${encodeURIComponent(slug)}`,
    { method: 'GET', credentials: 'include' },
  );
}

export async function fetchCommunityFeed(slug: string, page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return fetchJson<{
    posts: CommunityPost[];
    announcements: CommunityAnnouncement[];
    pagination: { page: number; pageSize: number; total: number };
  }>(`${API_BASE}/community/channels/${encodeURIComponent(slug)}/feed?${query}`, {
    method: 'GET',
    credentials: 'include',
  });
}

export async function createCommunityPost(slug: string, payload: PostPayload) {
  return fetchJson<{ post: CommunityPost }>(
    `${API_BASE}/community/channels/${encodeURIComponent(slug)}/posts`,
    { method: 'POST', credentials: 'include', body: JSON.stringify(payload) },
  );
}

export async function updateCommunityPost(postId: string, payload: Partial<PostPayload>) {
  return fetchJson<{ post: CommunityPost }>(`${API_BASE}/community/posts/${postId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export async function archiveCommunityPost(postId: string) {
  return fetchJson<{ post: CommunityPost }>(`${API_BASE}/community/posts/${postId}/archive`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchAdminCommunityChannels(): Promise<AdminCommunityChannel[]> {
  const data = await fetchJson<{ items: AdminCommunityChannel[] }>(
    `${API_BASE}/community/admin/channels`,
    { method: 'GET', credentials: 'include' },
  );
  return data.items ?? [];
}

export async function createAdminCommunityChannel(payload: ChannelPayload) {
  return fetchJson<{ channel: AdminCommunityChannel }>(`${API_BASE}/community/admin/channels`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCommunityChannel(id: string, payload: Partial<ChannelPayload>) {
  return fetchJson<{ channel: AdminCommunityChannel }>(`${API_BASE}/community/admin/channels/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export async function archiveAdminCommunityChannel(id: string) {
  return fetchJson<{ channel: AdminCommunityChannel }>(
    `${API_BASE}/community/admin/channels/${id}/archive`,
    { method: 'POST', credentials: 'include' },
  );
}

export async function restoreAdminCommunityChannel(id: string) {
  return fetchJson<{ channel: AdminCommunityChannel }>(
    `${API_BASE}/community/admin/channels/${id}/restore`,
    { method: 'POST', credentials: 'include' },
  );
}

export async function deleteAdminCommunityChannel(id: string) {
  return fetchJson<{ success: boolean }>(`${API_BASE}/community/admin/channels/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function fetchAdminCommunityAnnouncements(): Promise<AdminCommunityAnnouncement[]> {
  const data = await fetchJson<{ items: AdminCommunityAnnouncement[] }>(
    `${API_BASE}/community/admin/announcements`,
    { method: 'GET', credentials: 'include' },
  );
  return data.items ?? [];
}

export async function createAdminCommunityAnnouncement(payload: AnnouncementPayload) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements`,
    { method: 'POST', credentials: 'include', body: JSON.stringify(payload) },
  );
}

export async function updateAdminCommunityAnnouncement(id: string, payload: Partial<AnnouncementPayload>) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements/${id}`,
    { method: 'PUT', credentials: 'include', body: JSON.stringify(payload) },
  );
}

export async function publishAdminCommunityAnnouncement(id: string) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements/${id}/publish`,
    { method: 'POST', credentials: 'include' },
  );
}

export async function scheduleAdminCommunityAnnouncement(id: string, scheduledAt: string) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements/${id}/schedule`,
    { method: 'POST', credentials: 'include', body: JSON.stringify({ scheduledAt }) },
  );
}

export async function cancelAdminCommunityAnnouncement(id: string) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements/${id}/cancel`,
    { method: 'POST', credentials: 'include' },
  );
}

export async function archiveAdminCommunityAnnouncement(id: string) {
  return fetchJson<{ announcement: AdminCommunityAnnouncement }>(
    `${API_BASE}/community/admin/announcements/${id}/archive`,
    { method: 'POST', credentials: 'include' },
  );
}

export async function fetchPendingCommunityPosts(): Promise<CommunityPost[]> {
  const data = await fetchJson<{ items: CommunityPost[] }>(
    `${API_BASE}/community/admin/posts/pending`,
    { method: 'GET', credentials: 'include' },
  );
  return data.items ?? [];
}

export async function approveCommunityPost(postId: string) {
  return fetchJson<{ post: CommunityPost }>(`${API_BASE}/community/posts/${postId}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function rejectCommunityPost(postId: string) {
  return fetchJson<{ post: CommunityPost }>(`${API_BASE}/community/posts/${postId}/reject`, {
    method: 'POST',
    credentials: 'include',
  });
}
