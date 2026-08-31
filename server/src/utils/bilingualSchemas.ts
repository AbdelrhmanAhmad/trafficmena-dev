import { z } from 'zod';

export const requiredBilingualString = (label: string, min: number, max: number) =>
  z.object({
    titleEn: z.string().trim().min(min, `${label} (English) is required.`).max(max),
    titleAr: z.string().trim().min(min, `${label} (Arabic) is required.`).max(max),
  });

export const requiredBilingualTitleFields = z.object({
  titleEn: z.string().trim().min(1, 'Title (English) is required.').max(180),
  titleAr: z.string().trim().min(1, 'Title (Arabic) is required.').max(180),
});

export const requiredBilingualDescriptionFields = z.object({
  descriptionEn: z.string().trim().min(1, 'Description (English) is required.').max(8000),
  descriptionAr: z.string().trim().min(1, 'Description (Arabic) is required.').max(8000),
});

export const optionalBilingualDescriptionFields = z.object({
  descriptionEn: z.string().trim().max(8000).optional().nullable(),
  descriptionAr: z.string().trim().max(8000).optional().nullable(),
});

export const optionalBilingualLocationFields = z.object({
  locationEn: z.string().trim().max(500).optional().nullable(),
  locationAr: z.string().trim().max(500).optional().nullable(),
});

export const optionalBilingualDisplayNameFields = z.object({
  displayNameEn: z.string().trim().min(1, 'Display name (English) is required.').max(180),
  displayNameAr: z.string().trim().min(1, 'Display name (Arabic) is required.').max(180),
});

/** Accept legacy single-field admin payloads during transition (maps to both languages). */
export function expandLegacySingleField(value: string | undefined, fallback = '') {
  const trimmed = (value ?? fallback).trim();
  return { en: trimmed, ar: trimmed };
}
