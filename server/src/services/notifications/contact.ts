import {
  isE164PhoneNumber,
  normalizePhoneNumber,
} from '../../routes/api/users-phone.js';
import type { ContactClassification } from './types.js';

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 3 && SIMPLE_EMAIL_RE.test(trimmed);
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '***';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizeToE164(phone) ?? phone.trim();
  if (normalized.length < 6) return '***';
  const head = normalized.slice(0, 4);
  const tail = normalized.slice(-4);
  return `${head}****${tail}`;
}

/** Normalize to E.164 when possible; returns null if empty or not E.164-shaped. */
export function normalizeToE164(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  const normalized = normalizePhoneNumber(value.trim());
  if (!isE164PhoneNumber(normalized)) return null;
  return normalized;
}

export function classifyEmail(email: string | null | undefined): ContactClassification {
  if (!email || !email.trim()) {
    return { status: 'skip', reason: 'missing_or_invalid_email', masked: null };
  }
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    return { status: 'skip', reason: 'missing_or_invalid_email', masked: maskEmail(trimmed) };
  }
  return { status: 'deliverable', value: trimmed, masked: maskEmail(trimmed) ?? '***' };
}

export function classifyPhone(phone: string | null | undefined): ContactClassification {
  if (!phone || !phone.trim()) {
    return { status: 'skip', reason: 'missing_or_invalid_phone', masked: null };
  }
  const e164 = normalizeToE164(phone);
  if (!e164) {
    return {
      status: 'skip',
      reason: 'missing_or_invalid_phone',
      masked: maskPhone(phone.trim()),
    };
  }
  return { status: 'deliverable', value: e164, masked: maskPhone(e164) ?? '***' };
}
