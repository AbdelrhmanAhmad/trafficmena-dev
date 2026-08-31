import type { AppLocale } from './locale.js';
import {
  mapAdminBilingualLocation,
  mapAdminBilingualTitleDescription,
  mapAdminGuestExpert,
  mapPublicLocation,
  mapPublicTitleDescription,
  normalizeGuestExpert,
  type GuestExpertBilingual,
} from './contentMappers.js';

export type EventBilingualRow = {
  id: string;
  titleEn: string;
  titleAr: string;
  eventDescriptionEn?: string | null;
  eventDescriptionAr?: string | null;
  locationEn?: string | null;
  locationAr?: string | null;
  guestExperts?: unknown;
  date: Date;
  locationUrl?: string | null;
  maxAttendees?: number | null;
  meetingLink?: string | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  eventType: string;
  eventFormat: string;
  priceInCents?: number | null;
  isPublished: boolean;
  attendeeCount?: number;
};

export function presentPublicEvent(row: EventBilingualRow, locale: AppLocale) {
  const localized = mapPublicTitleDescription(
    {
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.eventDescriptionEn,
      descriptionAr: row.eventDescriptionAr,
    },
    locale,
  );
  const guestExperts = Array.isArray(row.guestExperts)
    ? (row.guestExperts as GuestExpertBilingual[]).map((expert) =>
        normalizeGuestExpert(expert, locale),
      )
    : [];

  return {
    id: row.id,
    title: localized.title,
    description: localized.description,
    date: row.date,
    location: mapPublicLocation(row, locale),
    locationUrl: row.locationUrl ?? null,
    maxAttendees: row.maxAttendees ?? null,
    meetingLink: row.meetingLink ?? null,
    imageUrl: row.imageUrl ?? null,
    tags: row.tags ?? [],
    eventType: row.eventType,
    eventFormat: row.eventFormat,
    priceInCents: row.priceInCents ?? null,
    isPublished: row.isPublished,
    attendeeCount: row.attendeeCount,
    guestExperts,
  };
}

export function presentAdminEvent(row: EventBilingualRow) {
  const guestExperts = Array.isArray(row.guestExperts)
    ? (row.guestExperts as GuestExpertBilingual[]).map((expert) => mapAdminGuestExpert(expert))
    : [];

  return {
    id: row.id,
    ...mapAdminBilingualTitleDescription({
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.eventDescriptionEn,
      descriptionAr: row.eventDescriptionAr,
    }),
    ...mapAdminBilingualLocation(row),
    date: row.date,
    locationUrl: row.locationUrl ?? null,
    maxAttendees: row.maxAttendees ?? null,
    meetingLink: row.meetingLink ?? null,
    imageUrl: row.imageUrl ?? null,
    tags: row.tags ?? [],
    eventType: row.eventType,
    eventFormat: row.eventFormat,
    priceInCents: row.priceInCents ?? null,
    isPublished: row.isPublished,
    attendeeCount: row.attendeeCount,
    guestExperts,
  };
}

export const eventBilingualSelect = {
  id: true as const,
  titleEn: true as const,
  titleAr: true as const,
  eventDescriptionEn: true as const,
  eventDescriptionAr: true as const,
  locationEn: true as const,
  locationAr: true as const,
  guestExperts: true as const,
  date: true as const,
  locationUrl: true as const,
  maxAttendees: true as const,
  meetingLink: true as const,
  imageUrl: true as const,
  tags: true as const,
  eventType: true as const,
  eventFormat: true as const,
  priceInCents: true as const,
  isPublished: true as const,
};
