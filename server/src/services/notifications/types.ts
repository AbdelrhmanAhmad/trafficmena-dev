import type { AppLocale } from '../../utils/locale.js';

export type NotificationChannel = 'email' | 'whatsapp';

export type NotificationAudienceType =
  | 'all_users'
  | 'event_attendees'
  | 'track_buyers'
  | 'masterclass_enrollees'
  | 'activity_channel_members'
  | 'role_based'
  | 'explicit_users';

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

export type NotifyBusinessEventInput = {
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  /** Prefer explicit recipients when known; otherwise use audience. */
  recipientUserIds?: string[];
  audience?: AudienceSpec;
  payload?: Record<string, unknown>;
  locale?: AppLocale;
  /** Defaults to `type` when looking up notification_templates. */
  templateKey?: string;
};

export type NotifyBusinessEventResult = {
  campaignId: string;
  deliveryIds: string[];
};

export type CreateAnnouncementCampaignInput = {
  titleEn: string;
  titleAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn?: string;
  bodyTextAr?: string;
  audience: AudienceSpec;
  createdBy: string;
  activityAnnouncementId?: string | null;
  templateId?: string | null;
};

export type CampaignSummary = {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type ContactClassification =
  | { status: 'deliverable'; value: string; masked: string }
  | { status: 'skip'; reason: string; masked: string | null };
