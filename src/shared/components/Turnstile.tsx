import { useCallback, useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile Site Key (Vite env)
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

type TurnstileOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
};

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: Array<() => void> = [];

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded && window.turnstile) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;

    window.onTurnstileLoad = () => {
      scriptLoaded = true;
      scriptLoading = false;
      for (const cb of loadCallbacks) {
        cb();
      }
      loadCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function Turnstile({
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  size = 'normal',
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current || !window.turnstile) return;

    // Clean up existing widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Ignore cleanup errors
      }
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onError,
        theme,
        size,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('[turnstile] Failed to render widget', error);
      onError?.();
    }
  }, [onVerify, onExpire, onError, theme, size]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      onError?.();
      setIsLoading(false);
      return;
    }

    loadTurnstileScript().then(renderWidget);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [renderWidget, onError]);

  return (
    <div className={className}>
      <div ref={containerRef} />
      {!TURNSTILE_SITE_KEY && !isLoading && (
        <div className="flex h-[65px] items-center justify-center text-sm text-muted-foreground">
          Security check is unavailable. Please try again later.
        </div>
      )}
      {TURNSTILE_SITE_KEY && isLoading && (
        <div className="flex h-[65px] items-center justify-center text-sm text-muted-foreground">
          Loading security check...
        </div>
      )}
    </div>
  );
}

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = useCallback((newToken: string) => {
    setToken(newToken);
    setIsVerified(true);
  }, []);

  const handleExpire = useCallback(() => {
    setToken(null);
    setIsVerified(false);
  }, []);

  const handleError = useCallback(() => {
    setToken(null);
    setIsVerified(false);
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setIsVerified(false);
  }, []);

  return {
    token,
    isVerified,
    handleVerify,
    handleExpire,
    handleError,
    reset,
  };
}

export { TURNSTILE_SITE_KEY };
