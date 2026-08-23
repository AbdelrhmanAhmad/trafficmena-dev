import { API_BASE, fetchJson } from './client';

// Custom OTP email-change flow. fetchJson attaches credentials + CSRF headers automatically.
export async function requestEmailChange(newEmail: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/auth/email-change/request`, {
    method: 'POST',
    body: JSON.stringify({ newEmail }),
  });
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
