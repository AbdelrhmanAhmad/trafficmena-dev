import { sanitizeRichTextHtml } from '../../utils/expertContent.js';
import type { AppLocale } from '../../utils/locale.js';
import { DEFAULT_LOCALE } from '../../utils/locale.js';

export type RenderableTemplate = {
  subjectEn: string;
  subjectAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn: string;
  bodyTextAr: string;
  allowedVariables: string[] | null | unknown;
};

export class TemplateRenderError extends Error {
  code: string;
  missingVariables: string[];

  constructor(message: string, missingVariables: string[] = []) {
    super(message);
    this.name = 'TemplateRenderError';
    this.code = 'TEMPLATE_RENDER_ERROR';
    this.missingVariables = missingVariables;
  }
}

const VAR_TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function asAllowedList(raw: string[] | null | unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function substituteAllowlisted(
  source: string,
  allowed: Set<string>,
  vars: Record<string, string>,
): string {
  return source.replace(VAR_TOKEN, (_match, name: string) => {
    if (!allowed.has(name)) {
      // Unknown tokens stay literal — never eval; only allowlisted keys substitute.
      return `{{${name}}}`;
    }
    return vars[name] ?? '';
  });
}

export type RenderedTemplate = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Allowlisted `{{var}}` substitution (no eval). Every entry in allowed_variables is required.
 * HTML output is sanitized with sanitizeRichTextHtml.
 */
export function renderTemplate(
  template: RenderableTemplate,
  locale: AppLocale | string | null | undefined,
  vars: Record<string, unknown>,
): RenderedTemplate {
  const lang: AppLocale = locale === 'ar' ? 'ar' : DEFAULT_LOCALE;
  const allowed = asAllowedList(template.allowedVariables);
  const allowedSet = new Set(allowed);

  const stringVars: Record<string, string> = {};
  for (const key of allowed) {
    const value = vars[key];
    if (value === undefined || value === null) {
      throw new TemplateRenderError(`Missing required template variable: ${key}`, [key]);
    }
    stringVars[key] = String(value);
  }

  const subjectSrc = lang === 'ar' ? template.subjectAr : template.subjectEn;
  const htmlSrc = lang === 'ar' ? template.bodyHtmlAr : template.bodyHtmlEn;
  const textSrc = lang === 'ar' ? template.bodyTextAr : template.bodyTextEn;

  const subject = substituteAllowlisted(subjectSrc, allowedSet, stringVars);
  const text = substituteAllowlisted(textSrc, allowedSet, stringVars);
  const htmlRaw = substituteAllowlisted(htmlSrc, allowedSet, stringVars);
  const html = sanitizeRichTextHtml(htmlRaw) ?? '';

  return { subject, html, text };
}

/** Freeform campaign body (announcements) — still sanitize HTML; light {{var}} support via allowlist. */
export function renderFreeformContent(args: {
  subject: string;
  html: string;
  text: string;
  allowedVariables?: string[];
  vars?: Record<string, unknown>;
}): RenderedTemplate {
  const allowed = args.allowedVariables ?? [];
  const allowedSet = new Set(allowed);
  const stringVars: Record<string, string> = {};
  for (const key of allowed) {
    const value = args.vars?.[key];
    if (value === undefined || value === null) {
      throw new TemplateRenderError(`Missing required template variable: ${key}`, [key]);
    }
    stringVars[key] = String(value);
  }

  const subject =
    allowed.length > 0
      ? substituteAllowlisted(args.subject, allowedSet, stringVars)
      : args.subject;
  const text =
    allowed.length > 0 ? substituteAllowlisted(args.text, allowedSet, stringVars) : args.text;
  const htmlRaw =
    allowed.length > 0 ? substituteAllowlisted(args.html, allowedSet, stringVars) : args.html;

  return {
    subject,
    text,
    html: sanitizeRichTextHtml(htmlRaw) ?? '',
  };
}
