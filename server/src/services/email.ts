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

const PLUNK_ENDPOINT = 'https://next-api.useplunk.com/v1/send';

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function sendOtpEmail({ email, otp, ttlMinutes }: SendOtpEmailArgs) {
  if (!env.PLUNK_API_KEY || !env.PLUNK_API_KEY.startsWith('sk_')) {
    console.warn('[plunk] Valid PLUNK_API_KEY missing; OTP email simulated (details redacted)');
    return;
  }

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

  try {
    const response = await fetch(PLUNK_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PLUNK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject,
        body: htmlBody,
        text: textBody,
        from: 'hello@trafficmena.com',
        name: 'TrafficMENA',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Plunk responded with ${response.status}: ${detail}`);
    }

    if (!isProduction) {
      console.info(`[plunk] OTP email sent to ${email}`);
    }
  } catch (error) {
    console.error('[plunk] Failed to send OTP email', error);
    throw error;
  }
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

  if (!env.PLUNK_API_KEY || !env.PLUNK_API_KEY.startsWith('sk_')) {
    console.warn(
      '[plunk] Valid PLUNK_API_KEY missing; invitation email simulated (details redacted)',
    );
    return;
  }

  try {
    const response = await fetch(PLUNK_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PLUNK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject,
        body: htmlBody,
        text: textBody,
        from: 'hello@trafficmena.com',
        name: 'TrafficMENA',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Plunk responded with ${response.status}: ${detail}`);
    }

    if (!isProduction) {
      console.info(`[plunk] Invitation email sent to ${email}`);
    }
  } catch (error) {
    console.error('[plunk] Failed to send invitation email', error);
    throw error;
  }
}
