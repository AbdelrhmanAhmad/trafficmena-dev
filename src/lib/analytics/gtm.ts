// Core GTM dataLayer push — all tracking goes through this function.
// Wrapped in try-catch so analytics never breaks the user experience.

export function pushToDataLayer(data: Record<string, unknown>): void {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  } catch {
    // Silent fail — analytics must never break the app
  }
}
