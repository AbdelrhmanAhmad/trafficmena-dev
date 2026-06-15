import { useEffect, useRef } from 'react';
import { trackViewItemList } from './events';
import { centsToUnits } from './helpers';

export const EVENTS_LIST_CONTEXT = {
  listId: 'events',
  listName: 'Events',
} as const;

export const TRACKS_LIST_CONTEXT = {
  listId: 'tracks',
  listName: 'Tracks',
} as const;

export type AnalyticsListContext = typeof EVENTS_LIST_CONTEXT | typeof TRACKS_LIST_CONTEXT;

export type AnalyticsDiscoveryItem = {
  item_id: string;
  item_name: string;
  item_category: string;
  price: number;
  currency: 'EGP';
  item_image_link?: string;
  item_link: string;
  index?: number;
};

type EventDiscoveryInput = {
  id: string;
  title: string;
  event_type: string;
  price_in_cents: number | null | undefined;
  image_url?: string | null;
};

type TrackDiscoveryInput = {
  id: string;
  title: string;
  price_in_cents: number | null | undefined;
  image_url?: string | null;
};

function getOptionalImageLink(imageUrl?: string | null): string | undefined {
  const normalizedImageUrl = imageUrl?.trim();
  return normalizedImageUrl ? normalizedImageUrl : undefined;
}

export function buildEventDiscoveryItem(
  event: EventDiscoveryInput,
  index?: number,
): AnalyticsDiscoveryItem {
  const itemImageLink = getOptionalImageLink(event.image_url);

  return {
    item_id: event.id,
    item_name: event.title,
    item_category: event.event_type,
    price: centsToUnits(event.price_in_cents),
    currency: 'EGP',
    ...(itemImageLink ? { item_image_link: itemImageLink } : {}),
    item_link: `/meetups/${event.id}`,
    ...(index === undefined ? {} : { index }),
  };
}

export function buildTrackDiscoveryItem(
  track: TrackDiscoveryInput,
  index?: number,
): AnalyticsDiscoveryItem {
  const itemImageLink = getOptionalImageLink(track.image_url);

  return {
    item_id: track.id,
    item_name: track.title,
    item_category: 'Track',
    price: centsToUnits(track.price_in_cents),
    currency: 'EGP',
    ...(itemImageLink ? { item_image_link: itemImageLink } : {}),
    item_link: `/tracks/${track.id}`,
    ...(index === undefined ? {} : { index }),
  };
}

export function isCanonicalDiscoveryListPath(pathname: string): boolean {
  return pathname === '/meetups';
}

export function useTrackedItemListView(
  context: AnalyticsListContext,
  items: AnalyticsDiscoveryItem[],
  options?: { enabled?: boolean },
): void {
  const previousTrackingKeyRef = useRef('');

  useEffect(() => {
    if (options?.enabled === false) {
      previousTrackingKeyRef.current = '';
      return;
    }

    if (!items.length) {
      previousTrackingKeyRef.current = '';
      return;
    }

    const trackingKey = `${context.listId}:${items
      .map((item) => `${item.item_id}:${item.index ?? -1}`)
      .join(',')}`;

    if (previousTrackingKeyRef.current === trackingKey) {
      return;
    }

    previousTrackingKeyRef.current = trackingKey;
    trackViewItemList(context.listId, context.listName, items);
  }, [context.listId, context.listName, items, options?.enabled]);
}
