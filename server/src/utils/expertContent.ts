/** Server-side HTML sanitization for user-editable rich text (TM-006). */

const SCRIPT_TAG = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const ON_EVENT_ATTR = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF = /href\s*=\s*(["']?)\s*javascript:/gi;

export function sanitizeRichTextHtml(input: string | null | undefined): string | null {
  if (input == null) return null;
  let value = input.trim();
  if (!value) return '';
  value = value.replace(SCRIPT_TAG, '');
  value = value.replace(ON_EVENT_ATTR, '');
  value = value.replace(JAVASCRIPT_HREF, 'href=$1#');
  return value;
}

export function sanitizePlainText(input: string | null | undefined, maxLength: number): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

const BLOCKED_URL_SCHEMES = /^(javascript|data|vbscript):/i;

export function sanitizeExternalUrl(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  if (BLOCKED_URL_SCHEMES.test(trimmed)) return null;
  return parsed.toString();
}

export function slugifyExpert(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'expert';
}
