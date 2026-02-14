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

// Dynamically compute Cairo's current UTC offset (handles any future DST changes via IANA DB)
export function getCairoOffsetString(): string {
  const now = new Date();
  const cairoStr = now.toLocaleString('en-US', { timeZone: CAIRO_TZ });
  const cairoTime = new Date(cairoStr);
  const offsetMinutes = Math.round((cairoTime.getTime() - now.getTime()) / 60_000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absH = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const absM = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  return `${sign}${absH}:${absM}`;
}

export const isUpcoming = (dateString: string): boolean => {
  try {
    return new Date(dateString) > new Date();
  } catch {
    return false;
  }
};
