import type { ReactNode } from 'react';
import type { AuthUser } from '@/app/auth/AuthContext';
import {
  AuthProvider as InternalAuthProvider,
  useAuth as useBetterAuth,
} from '@/app/auth/AuthContext';

export interface LegacyAuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<{ error: string | null }>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (params: { email: string; otp: string }) => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return <InternalAuthProvider>{children}</InternalAuthProvider>;
};

export const useAuth = (): LegacyAuthContextType => {
  const auth = useBetterAuth();

  const signOut = async () => {
    try {
      await auth.signOut();
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to sign out. Please try again.',
      };
    }
  };

  return {
    user: auth.user,
    session: auth.user ? { user: auth.user } : null,
    loading: auth.loading,
    error: auth.error,
    signOut,
    requestOtp: auth.requestOtp,
    verifyOtp: auth.verifyOtp,
    refreshSession: auth.refreshSession,
  };
};
