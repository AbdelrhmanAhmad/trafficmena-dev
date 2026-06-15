import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Series } from '@/features/series';

const STORAGE_KEY = 'trafficmena_commerce_cart_v1';
const LEGACY_STORAGE_KEY = 'trafficmena_series_cart_v1';
export const COMMERCE_CART_CLEARED_EVENT = 'commerce-cart-cleared';

/** Clear persisted cart (e.g. after a paid order). Syncs open tabs via a custom event. */
export function clearCommerceCartStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(COMMERCE_CART_CLEARED_EVENT));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export type CartItemKind = 'series' | 'digital_product';

export type CommerceCartItem = {
  kind: CartItemKind;
  itemId: string;
  title: string;
  priceInCents: number;
  imageUrl?: string | null;
};

/** @deprecated Use CommerceCartItem */
export type SeriesCartItem = CommerceCartItem & { kind: 'series'; seriesId: string };

type CommerceCartContextValue = {
  items: CommerceCartItem[];
  itemCount: number;
  totalCents: number;
  addItem: (item: CommerceCartItem) => void;
  removeItem: (kind: CartItemKind, itemId: string) => void;
  clearCart: () => void;
  hasItem: (kind: CartItemKind, itemId: string) => boolean;
};

const CommerceCartContext = createContext<CommerceCartContextValue | null>(null);

function isValidCartItem(item: unknown): item is CommerceCartItem {
  if (!item || typeof item !== 'object') return false;
  const entry = item as Partial<CommerceCartItem>;
  return (
    (entry.kind === 'series' || entry.kind === 'digital_product') &&
    typeof entry.itemId === 'string' &&
    entry.itemId.length > 0 &&
    typeof entry.title === 'string' &&
    typeof entry.priceInCents === 'number'
  );
}

function readStoredCart(): CommerceCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidCartItem);
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Array<{
        seriesId: string;
        title: string;
        priceInCents: number;
        imageUrl?: string | null;
      }>;
      if (Array.isArray(legacy)) {
        return legacy
          .filter((entry) => typeof entry.seriesId === 'string' && entry.seriesId.length > 0)
          .map((entry) => ({
            kind: 'series' as const,
            itemId: entry.seriesId,
            title: entry.title,
            priceInCents: entry.priceInCents,
            imageUrl: entry.imageUrl,
          }));
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function CommerceCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CommerceCartItem[]>(() => readStoredCart());

  useEffect(() => {
    const syncCleared = () => setItems([]);
    window.addEventListener(COMMERCE_CART_CLEARED_EVENT, syncCleared);
    return () => window.removeEventListener(COMMERCE_CART_CLEARED_EVENT, syncCleared);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CommerceCartItem) => {
    if (!item.itemId?.trim()) return;
    setItems((current) => {
      if (current.some((entry) => entry.kind === item.kind && entry.itemId === item.itemId)) {
        return current;
      }
      return [...current, item];
    });
  }, []);

  const removeItem = useCallback((kind: CartItemKind, itemId: string) => {
    setItems((current) =>
      current.filter((entry) => !(entry.kind === kind && entry.itemId === itemId)),
    );
  }, []);

  const clearCart = useCallback(() => {
    clearCommerceCartStorage();
    setItems([]);
  }, []);

  const hasItem = useCallback(
    (kind: CartItemKind, itemId: string) =>
      items.some((entry) => entry.kind === kind && entry.itemId === itemId),
    [items],
  );

  const value = useMemo(() => {
    const totalCents = items.reduce((sum, item) => sum + item.priceInCents, 0);
    return {
      items,
      itemCount: items.length,
      totalCents,
      addItem,
      removeItem,
      clearCart,
      hasItem,
    };
  }, [items, addItem, removeItem, clearCart, hasItem]);

  return <CommerceCartContext.Provider value={value}>{children}</CommerceCartContext.Provider>;
}

/** @deprecated Use CommerceCartProvider */
export const SeriesCartProvider = CommerceCartProvider;

export function useCommerceCart() {
  const context = useContext(CommerceCartContext);
  if (!context) {
    throw new Error('useCommerceCart must be used within CommerceCartProvider');
  }
  return context;
}

/** @deprecated Use useCommerceCart */
export function useSeriesCart() {
  const cart = useCommerceCart();
  return useMemo(
    () => ({
      items: cart.items.filter((item) => item.kind === 'series'),
      itemCount: cart.itemCount,
      totalCents: cart.totalCents,
      addItem: (item: Omit<SeriesCartItem, 'kind'> | CommerceCartItem) => {
        const itemId =
          'seriesId' in item && item.seriesId
            ? item.seriesId
            : 'itemId' in item
              ? item.itemId
              : '';
        cart.addItem({
          kind: 'series',
          itemId,
          title: item.title,
          priceInCents: item.priceInCents,
          imageUrl: item.imageUrl,
        });
      },
      removeItem: (seriesId: string) => cart.removeItem('series', seriesId),
      clearCart: cart.clearCart,
      hasItem: (seriesId: string) => cart.hasItem('series', seriesId),
    }),
    [cart],
  );
}

export function seriesToCartItem(
  series: Pick<Series, 'id' | 'title' | 'price_in_cents' | 'image_url'>,
): CommerceCartItem {
  return {
    kind: 'series',
    itemId: series.id,
    title: series.title,
    priceInCents: series.price_in_cents ?? 0,
    imageUrl: series.image_url,
  };
}

export function digitalProductToCartItem(product: {
  id: string;
  title: string;
  price_in_cents: number | null;
  image_url?: string | null;
}): CommerceCartItem {
  return {
    kind: 'digital_product',
    itemId: product.id,
    title: product.title,
    priceInCents: product.price_in_cents ?? 0,
    imageUrl: product.image_url,
  };
}

export function formatCartItemLabel(item: CommerceCartItem): string {
  return item.kind === 'series' ? `Series: ${item.title}` : item.title;
}

