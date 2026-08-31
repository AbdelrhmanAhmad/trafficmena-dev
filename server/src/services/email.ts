import { Resend } from 'resend';
import { env, isProduction } from '../config/env.js';
import {
  emailHtmlDir,
  emailHtmlLang,
  getEmailChangeCopy,
  getInvitationEmailCopy,
  getOtpEmailCopy,
} from '../i18n/emailCopy.js';
import type { AppLocale } from '../utils/locale.js';
import { DEFAULT_LOCALE } from '../utils/locale.js';

type SendOtpEmailArgs = {
  email: string;
  otp: string;
  ttlMinutes: number;
  locale?: AppLocale;
};

type SendInvitationEmailArgs = {
  email: string;
  invitationLink: string;
  expiresAt: Date;
  firstName?: string | null;
  inviterName?: string | null;
  customMessage?: string | null;
  locale?: AppLocale;
};

type SendEmailChangeNoticeArgs = {
  email: string; // the current (old) address being notified
  status: 'requested' | 'completed';
  maskedNewEmail: string;
  locale?: AppLocale;
};

// Sender MUST be on a Resend-verified domain. The apex trafficmena.com is not verified — only the
// updates.trafficmena.com subdomain — so the default uses it. Override via RESEND_FROM. The
// display-name format ("Name <addr>") replaces Plunk's separate from + name fields.
const FROM_ADDRESS = env.RESEND_FROM ?? 'TrafficMENA <hello@updates.trafficmena.com>';

// Thrown when Resend rejects a transactional send. Carries only the Resend error name (as `code`)
// and HTTP statusCode — never the raw SDK error or message, which can leak the recipient address.
// Mirrors InvitationError (services/invitations.ts) so callers switch on `code`, never parse message.
export class EmailDeliveryError extends Error {
  code: string;
  statusCode: number | null;

  constructor(code: string, statusCode: number | null) {
    super(`Email delivery failed: ${code}`);
    this.name = 'EmailDeliveryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const hasValidKey = () => Boolean(env.RESEND_API_KEY?.startsWith('re_'));

// Construct the client lazily, only after the re_-prefix guard passes — never call new Resend()
// with an undefined key (the SDK constructor throws "Missing API key"), which would crash on import
// in any keyless dev/CI/test environment and break the simulate path.
let client: Resend | null = null;
const getResend = () => {
  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
};

// Best-effort marketing-list continuity (Plunk parity): re-subscribe the recipient as a global
// Resend Contact after every successful send. update-or-create because contacts.create does not
// re-subscribe an existing contact, so update (which clears `unsubscribed`) is tried first and
// create is the fallback when the contact doesn't exist yet. Global contacts → no audienceId.
// Deliberately re-subscribes users who previously opted out (product-approved). Never throws.
async function subscribeContact(email: string) {
  try {
    const resend = getResend();
    const { error: updateError } = await resend.contacts.update({ email, unsubscribed: false });
    if (updateError) {
      const { error: createError } = await resend.contacts.create({ email, unsubscribed: false });
      if (createError) {
        console.warn(`[resend] contact subscribe failed (non-fatal): ${createError.name}`);
      }
    }
  } catch {
    console.warn('[resend] contact subscribe threw (non-fatal)');
  }
}

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
};

type RegistrationConfirmationEmailArgs = {
  to: string;
  subject: string;
  headline: string;
  intro: string;
  googleCalendarUrl: string;
  webCalendarUrl: string;
  icsDownloadUrl: string;
  attachment: { filename: string; content: string };
  locale?: AppLocale;
  googleCalendarLabel?: string;
  viewConfirmationLabel?: string;
  icsNote?: string;
  footer?: string;
};

// Single transport for all three senders. Throws EmailDeliveryError on failure — callers (Better
// Auth's sendVerificationOTP) rely on the throw to surface a failed delivery to the user. On
// success, fires the contact upsert off the critical path so list-building never adds a Resend
// round-trip to OTP-login latency and can never fail a send.
async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: TransactionalEmail) {
  if (!hasValidKey()) {
    console.warn('[resend] Valid RESEND_API_KEY missing; email simulated (details redacted)');
    return;
  }

  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    text,
    attachments: attachments?.map((file) => ({
      filename: file.filename,
      content: Buffer.from(file.content, 'utf8'),
    })),
  });

  if (error) {
    // Redacted: log/throw only the Resend error name + statusCode, never error.message (which can
    // carry the recipient address). Some Resend errors omit `name` (e.g. a 403 when the key isn't
    // authorized for the sender domain), so fall back to a non-empty code to keep logs and bulk
    // failure reasons meaningful.
    const code = error.name ?? 'unknown_error';
    console.error(`[resend] send failed: ${code} (status ${error.statusCode ?? 'n/a'})`);
    throw new EmailDeliveryError(code, error.statusCode ?? null);
  }

  if (!isProduction) {
    console.info(`[resend] transactional email sent (id ${data?.id ?? 'unknown'})`);
  }

  // Fire off the critical path — best-effort, never awaited, never throws.
  void subscribeContact(to);
}

export async function sendOtpEmail({ email, otp, ttlMinutes, locale = DEFAULT_LOCALE }: SendOtpEmailArgs) {
  const copy = getOtpEmailCopy(locale, otp, ttlMinutes);
  const dir = emailHtmlDir(locale);
  const lang = emailHtmlLang(locale);
  const textBody = `${copy.headline}\n\n${copy.body}\n\n${otp}\n\n${copy.footer ?? ''}`;
  const htmlBody = `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${copy.headline}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; }
      .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 24px rgba(16, 16, 16, 0.08); }
      .otp { font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #101010; }
      .subtitle { color: #4b5563; margin-top: 16px; }
      .brand { margin-top: 32px; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${copy.headline}</h1>
      <p class="subtitle">${copy.body}</p>
      <p class="otp">${otp}</p>
      <p class="brand">${copy.footer ?? ''}</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject: copy.subject, html: htmlBody, text: textBody });
}

// Out-of-band notice to the CURRENT address when an email change is requested/completed — an
// attack signal when the account is the target. Contains no OTP and only a masked new address.
export async function sendEmailChangeNotice({
  email,
  status,
  maskedNewEmail,
  locale = DEFAULT_LOCALE,
}: SendEmailChangeNoticeArgs) {
  const copy = getEmailChangeCopy(locale, status, maskedNewEmail);
  const dir = emailHtmlDir(locale);
  const lang = emailHtmlLang(locale);
  const textBody = `${copy.headline}\n\n${copy.body}\n\n${copy.footer}`;
  const htmlBody = `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${copy.subject}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; }
      .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 24px rgba(16, 16, 16, 0.08); }
      .subtitle { color: #4b5563; margin-top: 16px; line-height: 1.5; }
      .footer { margin-top: 32px; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${copy.headline}</h1>
      <p class="subtitle">${escapeHtml(copy.body)}</p>
      <p class="footer">${copy.footer}</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject: copy.subject, html: htmlBody, text: textBody });
}

export async function sendInvitationEmail({
  email,
  invitationLink,
  expiresAt,
  firstName,
  inviterName,
  customMessage,
  locale = DEFAULT_LOCALE,
}: SendInvitationEmailArgs) {
  const copy = getInvitationEmailCopy(locale, { firstName, inviterName, expiresAt });
  const dir = emailHtmlDir(locale);
  const lang = emailHtmlLang(locale);
  const friendlyExpiry = expiresAt.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  });
  const safeCustomMessage =
    customMessage && customMessage.trim().length > 0
      ? escapeHtml(customMessage.trim()).replace(/\r?\n/g, '<br />')
      : null;

  const textBody = `${copy.greeting}\n\n${copy.intro}\n\n${copy.cta}: ${invitationLink}\n\n${copy.expiryLabel} ${friendlyExpiry}\n\n${
    customMessage && customMessage.trim().length > 0 ? `${customMessage.trim()}\n\n` : ''
  }— TrafficMENA team`;

  const htmlBody = `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${copy.headline}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; }
      .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 24px rgba(16, 16, 16, 0.08); }
      .cta { display: inline-block; margin-top: 24px; padding: 12px 20px; background: linear-gradient(90deg, #05ef62 0%, #29cf9f 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .subtitle { color: #4b5563; margin-top: 16px; line-height: 1.5; }
      .footer { margin-top: 32px; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${copy.headline}</h1>
      <p class="subtitle">${copy.greeting}</p>
      <p class="subtitle">${copy.intro}</p>
      ${
        safeCustomMessage
          ? `<blockquote class="subtitle" style="border-left: 3px solid #05ef62; margin: 24px 0; padding-left: 16px; font-style: italic;">${safeCustomMessage}</blockquote>`
          : ''
      }
      <a class="cta" href="${invitationLink}">${copy.cta}</a>
      <p class="subtitle">${copy.expiryLabel} <strong>${friendlyExpiry}</strong></p>
      <p class="subtitle" style="word-break: break-all;">${invitationLink}</p>
      <p class="footer">${copy.footer}</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject: copy.subject, html: htmlBody, text: textBody });
}

export async function sendRegistrationConfirmationEmail({
  to,
  subject,
  headline,
  intro,
  googleCalendarUrl,
  webCalendarUrl,
  icsDownloadUrl,
  attachment,
  locale = DEFAULT_LOCALE,
  googleCalendarLabel = 'Add to Google Calendar',
  viewConfirmationLabel = 'View confirmation page',
  icsNote = 'We attached a calendar file (.ics) for Apple Calendar and Outlook. Online sessions link to your TrafficMENA event page — not the raw meeting link.',
  footer = 'TrafficMENA',
}: RegistrationConfirmationEmailArgs) {
  const dir = emailHtmlDir(locale);
  const lang = emailHtmlLang(locale);
  const textBody = `${headline}\n\n${intro}\n\n${googleCalendarLabel}: ${googleCalendarUrl}\n${viewConfirmationLabel}: ${webCalendarUrl}\nDownload ICS (requires sign-in): ${icsDownloadUrl}\n\n${icsNote}`;
  const htmlBody = `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; }
      .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 24px rgba(16, 16, 16, 0.08); }
      .cta { display: inline-block; margin-top: 16px; margin-right: 8px; padding: 12px 20px; background: linear-gradient(90deg, #05ef62 0%, #29cf9f 100%); color: #101010; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .secondary { display: inline-block; margin-top: 16px; padding: 12px 20px; border: 1px solid #d1d5db; color: #111827; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .subtitle { color: #4b5563; margin-top: 16px; line-height: 1.5; }
      .footer { margin-top: 32px; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(headline)}</h1>
      <p class="subtitle">${escapeHtml(intro)}</p>
      <a class="cta" href="${googleCalendarUrl}">${googleCalendarLabel}</a>
      <a class="secondary" href="${webCalendarUrl}">${viewConfirmationLabel}</a>
      <p class="subtitle">${icsNote}</p>
      <p class="footer">${footer}</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({
    to,
    subject,
    html: htmlBody,
    text: textBody,
    attachments: [attachment],
  });
}
