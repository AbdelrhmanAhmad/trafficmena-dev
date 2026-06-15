import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJson } from '@/app/api/client';

export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export type OtpIntent = 'signup' | 'signin';

type RequestOtpOptions = {
  turnstileToken?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  requestOtp: (email: string, intent?: OtpIntent, options?: RequestOtpOptions) => Promise<void>;
  verifyOtp: (params: {
    email: string;
    otp: string;
    intent?: OtpIntent;
  }) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const data = await fetchJson<{ session: unknown; user: AuthUser | null }>(
        `${API_BASE}/auth/session`,
        {
          method: 'GET',
        },
      );
      const resolvedUser = data?.user ?? null;
      setUser(resolvedUser);
      setError(null);
      return resolvedUser;
    } catch (err) {
      setUser(null);
      if (err instanceof Error && 'status' in err) {
        setError(err.message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const requestOtp = useCallback(
    async (email: string, intent?: OtpIntent, options?: RequestOtpOptions) => {
      setError(null);
      const payload: Record<string, string> = { email };
      if (intent) payload.intent = intent;
      if (options?.turnstileToken) payload.turnstileToken = options.turnstileToken;
      await fetchJson(`${API_BASE}/auth/otp/request`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    [],
  );

  const verifyOtp = useCallback(
    async ({ email, otp, intent }: { email: string; otp: string; intent?: OtpIntent }) => {
      setError(null);
      const result = await fetchJson<{ user: AuthUser }>(`${API_BASE}/auth/otp/verify`, {
        method: 'POST',
        body: JSON.stringify(intent ? { email, otp, intent } : { email, otp }),
      });
      const resolvedUser = result.user ?? null;
      setUser(resolvedUser);
      return resolvedUser;
    },
    [],
  );

  const signOut = useCallback(async () => {
    setError(null);
    await fetchJson(`${API_BASE}/auth/logout`, {
      method: 'POST',
    });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      requestOtp,
      verifyOtp,
      signOut,
      refreshSession: loadSession,
    }),
    [user, loading, error, requestOtp, verifyOtp, signOut, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
