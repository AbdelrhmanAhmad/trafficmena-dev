import { Resend } from 'resend';
import { env, isProduction } from '../config/env.js';

type SendOtpEmailArgs = {
  email: string;
  otp: string;
  ttlMinutes: number;
};

type SendInvitationEmailArgs = {
  email: string;
  invitationLink: string;
  expiresAt: Date;
  firstName?: string | null;
  inviterName?: string | null;
  customMessage?: string | null;
};

type SendEmailChangeNoticeArgs = {
  email: string; // the current (old) address being notified
  status: 'requested' | 'completed';
  maskedNewEmail: string;
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

type EmailAttachment = {
  filename: string;
  /** Raw bytes or base64 string (no data: prefix). */
  content: Buffer | string;
  contentId?: string;
  contentType?: string;
};

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
};

// Single transport for all three senders. Throws EmailDeliveryError on failure — callers (Better
// Auth's sendVerificationOTP) rely on the throw to surface a failed delivery to the user. On
// success, fires the contact upsert off the critical path so list-building never adds a Resend
// round-trip to OTP-login latency and can never fail a send.
async function sendTransactionalEmail({ to, subject, html, text, attachments }: TransactionalEmail) {
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
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            // Inline CID images (Gmail strips data: URLs — must use cid: attachments).
            contentId: a.contentId,
          })),
        }
      : {}),
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

export async function sendOtpEmail({ email, otp, ttlMinutes }: SendOtpEmailArgs) {
  const subject = 'Your TrafficMENA verification code';
  const textBody = `Your TrafficMENA verification code is ${otp}. It expires in ${ttlMinutes} minutes.`;
  const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TrafficMENA Verification Code</title>
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
      <h1>TrafficMENA Verification Code</h1>
      <p class="subtitle">Use the code below to access your account. This code expires in ${ttlMinutes} minutes.</p>
      <p class="otp">${otp}</p>
      <p class="brand">If you didn’t request this code, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject, html: htmlBody, text: textBody });
}

// Out-of-band notice to the CURRENT address when an email change is requested/completed — an
// attack signal when the account is the target. Contains no OTP and only a masked new address.
export async function sendEmailChangeNotice({
  email,
  status,
  maskedNewEmail,
}: SendEmailChangeNoticeArgs) {
  const requested = status === 'requested';
  const subject = requested
    ? 'Security alert: a change to your TrafficMENA email was requested'
    : 'Your TrafficMENA email address was changed';
  const sentence = requested
    ? `We received a request to change your TrafficMENA email to ${escapeHtml(maskedNewEmail)}. If this wasn't you, do not share any code and contact support immediately — your account may be targeted.`
    : `Your TrafficMENA email was changed to ${escapeHtml(maskedNewEmail)}. If you did not make this change, contact support immediately.`;
  const textBody = requested
    ? `We received a request to change your TrafficMENA email to ${maskedNewEmail}. If this wasn't you, contact support immediately.`
    : `Your TrafficMENA email was changed to ${maskedNewEmail}. If you did not make this change, contact support immediately.`;
  const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 24px; }
      .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 12px 24px rgba(16, 16, 16, 0.08); }
      .subtitle { color: #4b5563; margin-top: 16px; line-height: 1.5; }
      .footer { margin-top: 32px; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${requested ? 'Email change requested' : 'Email address changed'}</h1>
      <p class="subtitle">${sentence}</p>
      <p class="footer">This is an automated security notice from TrafficMENA.</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject, html: htmlBody, text: textBody });
}

export async function sendInvitationEmail({
  email,
  invitationLink,
  expiresAt,
  firstName,
  inviterName,
  customMessage,
}: SendInvitationEmailArgs) {
  const friendlyExpiry = expiresAt.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const greetingName = firstName?.trim() ? firstName.trim() : 'there';
  const inviter = inviterName?.trim() || 'A TrafficMENA host';
  const subject = `${inviter} invited you to TrafficMENA`;
  const safeCustomMessage =
    customMessage && customMessage.trim().length > 0
      ? escapeHtml(customMessage.trim()).replace(/\r?\n/g, '<br />')
      : null;

  const textBody = `Hi ${greetingName},\n\n${inviter} invited you to join TrafficMENA. Complete your profile and unlock the event and library experience using the secure link below.\n\nAccept your invitation: ${invitationLink}\n\nThe invitation expires on ${friendlyExpiry}.\n\n${
    customMessage && customMessage.trim().length > 0 ? `${customMessage.trim()}\n\n` : ''
  }— TrafficMENA team`;

  const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>You're invited to TrafficMENA</title>
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
      <h1>You're invited to TrafficMENA</h1>
      <p class="subtitle">Hi ${greetingName},</p>
      <p class="subtitle">${inviter} would like you to join the TrafficMENA community. Click below to confirm your account and access upcoming events and the knowledge library.</p>
      ${
        safeCustomMessage
          ? `<blockquote class="subtitle" style="border-left: 3px solid #05ef62; margin: 24px 0; padding-left: 16px; font-style: italic;">${safeCustomMessage}</blockquote>`
          : ''
      }
      <a class="cta" href="${invitationLink}">Accept invitation</a>
      <p class="subtitle">This invitation expires on <strong>${friendlyExpiry}</strong>. If the button does not work, copy and paste this link into your browser:</p>
      <p class="subtitle" style="word-break: break-all;">${invitationLink}</p>
      <p class="footer">If you didn’t expect this email, you can safely ignore it.</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({ to: email, subject, html: htmlBody, text: textBody });
}

type SendEcdTicketEmailArgs = {
  email: string;
  attendeeName: string;
  serial: string;
  orderCode: string;
  ticketName: string;
  eventTitle: string;
  eventStartIso: string;
  eventLocation: string;
  qrDataUrl: string;
  confirmationUrl: string;
};

export async function sendEcdTicketEmail({
  email,
  attendeeName,
  serial,
  orderCode,
  ticketName,
  eventTitle,
  eventStartIso,
  eventLocation,
  qrDataUrl,
  confirmationUrl,
}: SendEcdTicketEmailArgs) {
  const safeName = escapeHtml(attendeeName);
  const safeSerial = escapeHtml(serial);
  const safeOrder = escapeHtml(orderCode);
  const safeTicket = escapeHtml(ticketName);
  const safeEvent = escapeHtml(eventTitle);
  const safeLocation = escapeHtml(eventLocation);
  const when = (() => {
    try {
      return new Date(eventStartIso).toLocaleString('en-GB', {
        timeZone: 'Africa/Cairo',
        dateStyle: 'full',
        timeStyle: 'short',
      });
    } catch {
      return eventStartIso;
    }
  })();

  const sameId = orderCode === serial;
  const subject = `Your ticket ${serial} — ${eventTitle}`;
  const textBody = `Hi ${attendeeName},

Your ticket for ${eventTitle} is confirmed.

Ticket ID: ${serial}
${sameId ? '' : `Booking: ${orderCode}\n`}Pass: ${ticketName}
When: ${when}
Where: ${eventLocation}

Show the QR image in this email at entry (or present this ticket ID).
If images are blocked, open attachments or use the ticket ID above.

View booking: ${confirmationUrl}

— TrafficMENA`;

  // Gmail/Outlook strip data: URLs — embed QR as inline CID attachment.
  const qrCid = 'ecd-ticket-qr';
  const base64Match = /^data:image\/png;base64,(.+)$/i.exec(qrDataUrl || '');
  const qrBase64 = base64Match?.[1] || '';
  if (!qrBase64) {
    throw new EmailDeliveryError('missing_qr_image', null);
  }

  const htmlBody = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background-color:#f4f6f8;color:#1f2630;font-family:Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #d5dae0;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#04c44e;font-weight:700;">ECommerce Day 2026</div>
      <h1 style="font-size:22px;margin:8px 0 16px;color:#101010;">Your ticket is ready</h1>
      <p style="color:#4a5563;line-height:1.6;margin:0 0 8px;">Hi ${safeName},</p>
      <p style="color:#4a5563;line-height:1.6;margin:0 0 8px;">Show this QR at entry. Keep this email handy.</p>
      <p style="color:#4a5563;line-height:1.6;margin:0 0 8px;"><strong>Ticket ID:</strong> ${safeSerial}<br/>
      ${sameId ? '' : `<strong>Booking:</strong> ${safeOrder}<br/>`}
      <strong>Pass:</strong> ${safeTicket}<br/>
      <strong>When:</strong> ${escapeHtml(when)}<br/>
      <strong>Where:</strong> ${safeLocation}</p>
      <p style="font-family:Consolas,Monaco,monospace;font-size:14px;background:#f4f6f8;border:1px solid #e6eaee;border-radius:8px;padding:10px 12px;word-break:break-all;">${safeSerial}</p>
      <div style="text-align:center;margin:24px 0;">
        <img src="cid:${qrCid}" alt="Ticket QR for ${safeSerial}" width="220" height="220" style="display:block;margin:0 auto;width:220px;height:220px;border:1px solid #e6eaee;border-radius:12px;" />
      </div>
      <p style="text-align:center;"><a href="${escapeHtml(confirmationUrl)}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#05ef62;color:#101010;text-decoration:none;border-radius:10px;font-weight:600;">Open booking page</a></p>
      <p style="margin-top:28px;font-size:13px;color:#6b747e;">Questions: info@trafficmena.com · ${safeEvent}</p>
    </div>
  </body>
</html>`;

  await sendTransactionalEmail({
    to: email,
    subject,
    html: htmlBody,
    text: textBody,
    attachments: [
      {
        filename: `ecd-ticket-${serial.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`,
        content: qrBase64,
        contentType: 'image/png',
        contentId: qrCid,
      },
    ],
  });
}
