import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJson } from '@/app/api/client';

export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (params: { email: string; otp: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ session: unknown; user: AuthUser | null }>(
        `${API_BASE}/auth/session`,
        {
          method: 'GET',
        },
      );
      setUser(data?.user ?? null);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof Error && 'status' in err) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const requestOtp = useCallback(async (email: string) => {
    setError(null);
    await fetchJson(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const verifyOtp = useCallback(async ({ email, otp }: { email: string; otp: string }) => {
    setError(null);
    const result = await fetchJson<{ user: AuthUser }>(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    setUser(result.user ?? null);
  }, []);

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
