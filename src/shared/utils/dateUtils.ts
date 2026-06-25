// All dates display in Cairo timezone — single source of truth
export const CAIRO_TZ = 'Africa/Cairo';

export const formatMeetupDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const datePart = new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
    return `${datePart} \u00B7 ${timePart}`;
  } catch {
    return dateString;
  }
};

export const formatLongDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

// Card-friendly: "Feb 14" (no year)
export const formatCardDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

export const formatDateWithDay = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

// Convert a UTC date to a datetime-local input value in Cairo timezone
export function toCairoDatetimeLocal(input: string | Date | undefined): string {
  const date = input ? new Date(input) : new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// Cairo's UTC offset (minutes east of UTC) at a given instant, read from IANA Africa/Cairo.
function cairoOffsetMinutes(instant: Date): number {
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TZ,
    timeZoneName: 'longOffset',
  })
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')?.value; // e.g. "GMT+03:00"
  const match = tzName ? /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName) : null;
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

// Convert a Cairo wall-clock datetime-local value ("YYYY-MM-DDTHH:mm") to a UTC ISO string,
// using the correct Cairo offset for THAT date (DST-aware). Environment-independent: the offset
// comes from IANA — the same source the display functions trust — so the round-trip is exact
// regardless of the machine's local timezone. Replaces the broken offset-by-device-tz approach.
export function cairoLocalToUtcIso(datetimeLocal: string | undefined): string {
  const match = datetimeLocal
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(datetimeLocal)
    : null;
  if (!match) return '';
  const [, year, month, day, hour, minute] = match.map(Number);
  // Treat the wall time as if it were UTC, then subtract Cairo's offset at that instant. A second
  // pass re-resolves the offset at the corrected instant so DST-boundary times stay exact.
  const provisional = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = provisional - cairoOffsetMinutes(new Date(provisional)) * 60_000;
  const utc = provisional - cairoOffsetMinutes(new Date(firstPass)) * 60_000;
  return new Date(utc).toISOString();
}

export const isUpcoming = (dateString: string): boolean => {
  try {
    return new Date(dateString) > new Date();
  } catch {
    return false;
  }
};
