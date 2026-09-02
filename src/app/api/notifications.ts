import { API_BASE, fetchJson } from './client';

export type NotificationChannel = 'email' | 'whatsapp';

export type AudienceSpec =
  | { type: 'all_users' }
  | { type: 'event_attendees'; eventId: string }
  | { type: 'track_buyers'; trackId: string }
  | { type: 'masterclass_enrollees'; masterclassId: string }
  | { type: 'activity_channel_members'; channelId: string }
  | { type: 'role_based'; roles: string[] }
  | { type: 'explicit_users'; userIds: string[] };

export type AudiencePreview = {
  total: number;
  emailDeliverable: number;
  emailSkipped: number;
  whatsappEligible: number;
  whatsappSkipped: number;
};

export type NotificationTemplate = {
  id: string;
  key: string;
  category: string;
  channel: NotificationChannel;
  isActive: boolean;
  subjectEn: string;
  subjectAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn: string;
  bodyTextAr: string;
  whatsappProviderTemplateId: string | null;
  allowedVariables: string[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationTemplatePayload = {
  key: string;
  category: string;
  channel: NotificationChannel;
  isActive?: boolean;
  subjectEn?: string;
  subjectAr?: string;
  bodyHtmlEn?: string;
  bodyHtmlAr?: string;
  bodyTextEn?: string;
  bodyTextAr?: string;
  whatsappProviderTemplateId?: string | null;
  allowedVariables?: string[];
};

export type NotificationCampaign = {
  id: string;
  kind: 'announcement' | 'system';
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  activityAnnouncementId: string | null;
  templateId: string | null;
  audienceType: string | null;
  audienceRef: Record<string, unknown>;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  titleEn: string;
  titleAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn: string;
  bodyTextAr: string;
  summary: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCampaignPayload = {
  titleEn: string;
  titleAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn?: string;
  bodyTextAr?: string;
  audience: AudienceSpec;
  activityAnnouncementId?: string | null;
  templateId?: string | null;
};

export type NotificationDelivery = {
  id: string;
  campaignId: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  status: string;
  skipReason: string | null;
  destinationMasked: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  locale: string;
  claimedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryListQuery = {
  status?: string;
  channel?: string;
  eventType?: string;
  category?: string;
  campaignId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// --- Templates -------------------------------------------------------------

export async function fetchNotificationTemplates() {
  const data = await fetchJson<{ items: NotificationTemplate[] }>(
    `${API_BASE}/notifications/templates`,
    { method: 'GET', credentials: 'include' },
  );
  return data.items ?? [];
}

export async function fetchNotificationTemplate(id: string) {
  const data = await fetchJson<{ data: NotificationTemplate }>(
    `${API_BASE}/notifications/templates/${id}`,
    { method: 'GET', credentials: 'include' },
  );
  return data.data;
}

export async function createNotificationTemplate(payload: NotificationTemplatePayload) {
  const data = await fetchJson<{ data: NotificationTemplate }>(
    `${API_BASE}/notifications/templates`,
    { method: 'POST', credentials: 'include', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function updateNotificationTemplate(
  id: string,
  payload: Partial<Omit<NotificationTemplatePayload, 'key' | 'channel'>>,
) {
  const data = await fetchJson<{ data: NotificationTemplate }>(
    `${API_BASE}/notifications/templates/${id}`,
    { method: 'PUT', credentials: 'include', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function activateNotificationTemplate(id: string) {
  const data = await fetchJson<{ data: NotificationTemplate }>(
    `${API_BASE}/notifications/templates/${id}/activate`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}

export async function deactivateNotificationTemplate(id: string) {
  const data = await fetchJson<{ data: NotificationTemplate }>(
    `${API_BASE}/notifications/templates/${id}/deactivate`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}

// --- Campaigns -------------------------------------------------------------

export async function fetchNotificationCampaigns(kind?: 'announcement' | 'system') {
  const data = await fetchJson<{ items: NotificationCampaign[] }>(
    `${API_BASE}/notifications/campaigns${buildQuery({ kind })}`,
    { method: 'GET', credentials: 'include' },
  );
  return data.items ?? [];
}

export async function fetchNotificationCampaign(id: string) {
  const data = await fetchJson<{ data: NotificationCampaign }>(
    `${API_BASE}/notifications/campaigns/${id}`,
    { method: 'GET', credentials: 'include' },
  );
  return data.data;
}

export async function createNotificationCampaign(payload: CreateCampaignPayload) {
  const data = await fetchJson<{ data: NotificationCampaign }>(
    `${API_BASE}/notifications/campaigns`,
    { method: 'POST', credentials: 'include', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function previewCampaignAudience(id: string) {
  const data = await fetchJson<{ data: AudiencePreview }>(
    `${API_BASE}/notifications/campaigns/${id}/preview`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}

export async function sendNotificationCampaign(id: string) {
  const data = await fetchJson<{ data: { campaignId: string; deliveryIds: string[] } }>(
    `${API_BASE}/notifications/campaigns/${id}/send`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}

export async function scheduleNotificationCampaign(id: string, scheduledAt: string) {
  const data = await fetchJson<{ data: NotificationCampaign }>(
    `${API_BASE}/notifications/campaigns/${id}/schedule`,
    {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ scheduledAt }),
    },
  );
  return data.data;
}

export async function cancelNotificationCampaign(id: string) {
  const data = await fetchJson<{ data: NotificationCampaign }>(
    `${API_BASE}/notifications/campaigns/${id}/cancel`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}

export async function previewAudience(audience: AudienceSpec) {
  const data = await fetchJson<{ data: AudiencePreview }>(
    `${API_BASE}/notifications/audiences/preview`,
    { method: 'POST', credentials: 'include', body: JSON.stringify(audience) },
  );
  return data.data;
}

// --- Deliveries ------------------------------------------------------------

export async function fetchNotificationDeliveries(query: DeliveryListQuery = {}) {
  return fetchJson<{
    items: NotificationDelivery[];
    total: number;
    limit: number;
    offset: number;
  }>(`${API_BASE}/notifications/deliveries${buildQuery(query)}`, {
    method: 'GET',
    credentials: 'include',
  });
}

export async function fetchNotificationDelivery(id: string) {
  const data = await fetchJson<{ data: NotificationDelivery }>(
    `${API_BASE}/notifications/deliveries/${id}`,
    { method: 'GET', credentials: 'include' },
  );
  return data.data;
}

export async function retryNotificationDelivery(id: string) {
  const data = await fetchJson<{ data: { id: string; status: string } }>(
    `${API_BASE}/notifications/deliveries/${id}/retry`,
    { method: 'POST', credentials: 'include', body: '{}' },
  );
  return data.data;
}
