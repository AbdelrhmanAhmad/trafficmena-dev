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
    // Kept short for the compact selector — the offline-recordings nuance is shown in the session
    // list banner. Must keep "recordings of all sessions" (asserted in track-ticket-types-ui.test).
    benefit: 'Live online sessions + recordings of all sessions.',
    includedFormats: ['online'],
  },
  online_offline: {
    label: 'Online + Offline',
    priceKey: 'online_offline_price_cents',
    benefit: 'Live online + the in-person offline day + all recordings.',
    includedFormats: ['online', 'offline'],
  },
  offline_only: {
    label: 'Offline Only',
    priceKey: 'offline_only_price_cents',
    benefit: 'The in-person offline day + its recordings.',
    includedFormats: ['offline'],
  },
};

export const TICKET_TYPE_ORDER: readonly TicketType[] = [
  'online_only',
  'online_offline',
  'offline_only',
];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  online_only: 'Online Only',
  online_offline: 'Online + Offline',
  offline_only: 'Offline Only',
};

/** Display label for an enrolled-table row: the variant, "Manual grant", or "—" for legacy. */
export function ticketTypeLabel(
  ticketType: TicketType | null | undefined,
  isManualGrant = false,
): string {
  if (ticketType) return TICKET_TYPE_LABELS[ticketType];
  return isManualGrant ? 'Manual grant' : '—';
}

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

export type TicketOption = {
  type: TicketType;
  label: string;
  benefit: string;
  /** Price in cents, or null when the variant is disabled (not sold by this track). */
  priceCents: number | null;
  enabled: boolean;
};

/**
 * All three variants in canonical order, each flagged enabled/disabled. The public selector renders
 * disabled variants as "Not available now" (greyed, non-selectable) rather than hiding them, so a
 * buyer can see the full menu and what they're missing.
 */
export function getAllTicketTypes(track: TrackTicketPrices): TicketOption[] {
  return TICKET_TYPE_ORDER.map((type) => {
    const priceCents = track[TICKET_META[type].priceKey];
    return {
      type,
      label: TICKET_META[type].label,
      benefit: TICKET_META[type].benefit,
      priceCents: priceCents ?? null,
      enabled: priceCents != null,
    };
  });
}

export function hasTicketTypes(track: TrackTicketPrices): boolean {
  return getEnabledTicketTypes(track).length > 0;
}

export function includedFormatsFor(type: TicketType): readonly EventFormat[] {
  return TICKET_META[type].includedFormats;
}
