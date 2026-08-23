const STORAGE_KEY = 'trafficmena_checkout_return_v1';

export type CheckoutReturnContext = {
  paymentId: string;
  invoiceId?: string;
  itemType?: string;
};

export function rememberCheckoutReturn(context: CheckoutReturnContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function readCheckoutReturn(): CheckoutReturnContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutReturnContext;
    if (!parsed?.paymentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckoutReturn(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
