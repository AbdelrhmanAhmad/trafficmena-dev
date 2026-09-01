/** Server-side sanitization for Activity Hub UGC and editorial content (TM-006). */

export {
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeRichTextHtml,
} from './expertContent.js';

export function slugifyChannel(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'channel';
}

export const COMMUNITY_POST_BODY_MAX = 20_000;
export const COMMUNITY_POST_TITLE_MAX = 300;
