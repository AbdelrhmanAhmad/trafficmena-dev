import { useMemo } from 'react';

/**
 * Determines if location URL should be visible to the user.
 * Follows same pattern as meeting link visibility.
 */
export function useLocationVisibility(
  locationUrl: string | null | undefined,
  isRegistered: boolean,
  isAdmin: boolean,
  isLoading = false,
) {
  return useMemo(() => {
    if (!locationUrl || isLoading) return false;
    if (isAdmin) return true;
    return isRegistered;
  }, [locationUrl, isRegistered, isAdmin, isLoading]);
}

/**
 * Simple HTTPS URL validation (no domain whitelist).
 * Returns true for any valid HTTPS URL.
 */
export function isValidLocationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
