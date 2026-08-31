export type ResolveClientIpInput = {
  trustProxy: boolean;
  cfConnectingIp?: string | null;
  forwardedFor?: string | null;
  realIp?: string | null;
  socketAddress?: string | null;
};

function firstForwardedHop(value: string): string {
  return value.split(',')[0]?.trim() ?? value.trim();
}

/** Resolve client IP; forwarded headers are honored only when trustProxy is true. */
export function resolveClientIp(input: ResolveClientIpInput): string {
  if (input.trustProxy) {
    if (input.cfConnectingIp?.trim()) {
      return firstForwardedHop(input.cfConnectingIp);
    }
    if (input.forwardedFor?.trim()) {
      return firstForwardedHop(input.forwardedFor);
    }
    if (input.realIp?.trim()) {
      return input.realIp.trim();
    }
  }

  if (input.socketAddress?.trim()) {
    return input.socketAddress.trim();
  }

  return 'unknown';
}
