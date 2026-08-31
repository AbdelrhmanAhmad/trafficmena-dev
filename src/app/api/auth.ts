import { API_BASE, fetchJson } from './client';

export type EmailChangePhase = 'current_email' | 'new_email';

export async function requestEmailChange(
  newEmail: string,
): Promise<{ success: boolean; phase: EmailChangePhase }> {
  return fetchJson<{ success: boolean; phase: EmailChangePhase }>(
    `${API_BASE}/auth/email-change/request`,
    {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    },
  );
}

export async function verifyCurrentEmailChange(
  newEmail: string,
  otp: string,
): Promise<{ success: boolean; phase: EmailChangePhase }> {
  return fetchJson<{ success: boolean; phase: EmailChangePhase }>(
    `${API_BASE}/auth/email-change/verify-current`,
    {
      method: 'POST',
      body: JSON.stringify({ newEmail, otp }),
    },
  );
}

export async function verifyEmailChange(
  newEmail: string,
  otp: string,
): Promise<{ success: boolean; email: string }> {
  return fetchJson<{ success: boolean; email: string }>(`${API_BASE}/auth/email-change/verify`, {
    method: 'POST',
    body: JSON.stringify({ newEmail, otp }),
  });
}
