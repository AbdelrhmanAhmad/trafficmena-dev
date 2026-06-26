// One-time backfill intent for the `events.event_format` migration (U1).
//
// Historically delivery mode was inferred as `meetingLink && !location`, and admins overloaded the
// `location` text field by typing the literal word "online". This module encodes the *intended*
// mapping used to backfill the new explicit `event_format` column and to clear the literal
// online/offline text out of `location` (which reverts to address-only).
//
// It is the single source of truth shared by the migration SQL, the pre-migration diff report, and
// the unit test — so the SQL and the report can never silently disagree about what a row should be.

export type EventFormat = 'online' | 'offline';

export type LegacyEventRow = {
  meetingLink?: string | null;
  location?: string | null;
};

export type BackfillDecision = {
  format: EventFormat;
  /** True when `location` held literal "online"/"offline" text that must be cleared to null. */
  clearLocation: boolean;
};

const normalize = (value: string | null | undefined): string => (value ?? '').trim();

/** True when the location field is literal delivery-mode text rather than a real address. */
export function isLiteralFormatText(location: string | null | undefined): boolean {
  const text = normalize(location).toLowerCase();
  return text === 'online' || text === 'offline';
}

/**
 * Resolve the intended `event_format` (and whether to clear `location`) for an existing row.
 *
 * Intent table:
 *  - has meetingLink, no location           -> online  (keep location null)
 *  - location literally "online"            -> online  (clear text)
 *  - location literally "offline"           -> offline (clear text)
 *  - location is a real address             -> offline (keep)
 *  - neither link nor location              -> offline (conservative: matches the column default and
 *                                                       preserves the old "paid for subscribers" behavior)
 */
export function deriveLegacyEventFormat(row: LegacyEventRow): BackfillDecision {
  const location = normalize(row.location);
  const literal = location.toLowerCase();

  if (literal === 'online') return { format: 'online', clearLocation: true };
  if (literal === 'offline') return { format: 'offline', clearLocation: true };

  // A meeting link with no address is an online session.
  if (normalize(row.meetingLink) !== '' && location === '') {
    return { format: 'online', clearLocation: false };
  }

  // Real address, or an incomplete row with neither signal -> offline (the safe default).
  return { format: 'offline', clearLocation: false };
}

/** Old, partly-buggy inference. Kept only so the diff report can flag rows whose pricing flips. */
export function legacyOnlineInference(row: LegacyEventRow): boolean {
  return normalize(row.meetingLink) !== '' && normalize(row.location) === '';
}
