import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AuthUser, OtpIntent } from '@/app/auth/AuthContext';
import {
  AuthProvider as InternalAuthProvider,
  useAuth as useBetterAuth,
} from '@/app/auth/AuthContext';

type RequestOtpOptions = {
  turnstileToken?: string;
};

export interface LegacyAuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<{ error: string | null }>;
  requestOtp: (email: string, intent?: OtpIntent, options?: RequestOtpOptions) => Promise<void>;
  verifyOtp: (params: {
    email: string;
    otp: string;
    intent?: OtpIntent;
  }) => Promise<AuthUser | null>;
  refreshSession: () => Promise<AuthUser | null>;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return <InternalAuthProvider>{children}</InternalAuthProvider>;
};

export const useAuth = (): LegacyAuthContextType => {
  const auth = useBetterAuth();
  const queryClient = useQueryClient();

  const signOut = async () => {
    try {
      await auth.signOut();
      queryClient.removeQueries({ queryKey: ['current-user'] });
      queryClient.removeQueries({ queryKey: ['current-subscription'] });
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
