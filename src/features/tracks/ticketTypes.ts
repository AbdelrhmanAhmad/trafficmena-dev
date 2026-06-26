// Frontend mirror of the backend ticket entitlement (server/src/routes/api/ticketAccess.ts).
// Derives the ticket variants a track offers, their prices, benefit copy, and which session formats
// each includes — so the public buying page can render the selector and filter the session list.

export type TicketType = 'online_only' | 'online_offline' | 'offline_only';
export type EventFormat = 'online' | 'offline';

export type TrackTicketPrices = {
  online_only_price_cents: number | null;
  online_offline_price_cents: number | null;
  offline_only_price_cents: number | null;
};

type TicketMeta = {
  label: string;
  priceKey: keyof TrackTicketPrices;
  // Approved benefit line shown under the selector.
  benefit: string;
  includedFormats: readonly EventFormat[];
};

const TICKET_META: Record<TicketType, TicketMeta> = {
  online_only: {
    label: 'Online Only',
    priceKey: 'online_only_price_cents',
    benefit:
      'Online sessions live + recordings of all sessions (offline added after the offline day).',
    includedFormats: ['online'],
  },
  online_offline: {
    label: 'Online + Offline',
    priceKey: 'online_offline_price_cents',
    benefit: 'Online sessions live + offline day in person + recordings of everything.',
    includedFormats: ['online', 'offline'],
  },
  offline_only: {
    label: 'Offline Only',
    priceKey: 'offline_only_price_cents',
    benefit: 'Offline day in person + its recordings (no online sessions).',
    includedFormats: ['offline'],
  },
};

export const TICKET_TYPE_ORDER: readonly TicketType[] = [
  'online_only',
  'online_offline',
  'offline_only',
];

export type EnabledTicketType = {
  type: TicketType;
  label: string;
  priceCents: number;
  benefit: string;
  includedFormats: readonly EventFormat[];
};

/** The ticket variants the track sells (non-null price column), in canonical order. */
export function getEnabledTicketTypes(track: TrackTicketPrices): EnabledTicketType[] {
  return TICKET_TYPE_ORDER.flatMap((type) => {
    const priceCents = track[TICKET_META[type].priceKey];
    if (priceCents == null) return [];
    return [{ type, priceCents, ...TICKET_META[type] }];
  });
}

export function hasTicketTypes(track: TrackTicketPrices): boolean {
  return getEnabledTicketTypes(track).length > 0;
}

export function includedFormatsFor(type: TicketType): readonly EventFormat[] {
  return TICKET_META[type].includedFormats;
}
