import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchPublicSettings } from '@/app/api/settings';

type GuardState =
  | { status: 'loading' }
  | { status: 'allow' }
  | { status: 'redirect'; target: string };

interface SignUpGuardProps {
  children: ReactNode;
}

const ACCEPTANCE_CACHE_KEY = 'trafficmena:invitation-acceptance';

type StoredInvitationAcceptance = {
  token: string;
  invitationId?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string;
};

export function SignUpGuard({ children }: SignUpGuardProps) {
  const location = useLocation();
  const [guardState, setGuardState] = useState<GuardState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const evaluateGuard = async () => {
      const invitationDetails = (() => {
        try {
          const params = new URLSearchParams(location.search);
          const token = params.get('invitation');
          if (!token) {
            return null;
          }

          return {
            token,
            email: params.get('email')?.toLowerCase() ?? undefined,
            firstName: params.get('firstName') ?? undefined,
            lastName: params.get('lastName') ?? undefined,
          };
        } catch {
          return null;
        }
      })();

      if (invitationDetails && typeof window !== 'undefined') {
        try {
          const existingRaw = sessionStorage.getItem(ACCEPTANCE_CACHE_KEY);

          if (existingRaw) {
            try {
              const existingDetails = JSON.parse(existingRaw) as StoredInvitationAcceptance;

              if (existingDetails?.token === invitationDetails.token) {
                const mergedDetails: StoredInvitationAcceptance = {
                  ...existingDetails,
                  ...(invitationDetails.email ? { email: invitationDetails.email } : {}),
                  ...(invitationDetails.firstName !== undefined
                    ? { firstName: invitationDetails.firstName }
                    : {}),
                  ...(invitationDetails.lastName !== undefined
                    ? { lastName: invitationDetails.lastName }
                    : {}),
                };

                sessionStorage.setItem(ACCEPTANCE_CACHE_KEY, JSON.stringify(mergedDetails));
              } else {
                const payload: StoredInvitationAcceptance = {
                  token: invitationDetails.token,
                  invitationId: '',
                  email: invitationDetails.email ?? '',
                };
                if (invitationDetails.firstName !== undefined) {
                  payload.firstName = invitationDetails.firstName;
                }
                if (invitationDetails.lastName !== undefined) {
                  payload.lastName = invitationDetails.lastName;
                }
                sessionStorage.setItem(ACCEPTANCE_CACHE_KEY, JSON.stringify(payload));
              }
            } catch (parseError) {
              console.warn(
                '[signup-guard] failed to parse invitation cache, resetting',
                parseError,
              );
              const fallbackPayload: StoredInvitationAcceptance = {
                token: invitationDetails.token,
                invitationId: '',
                email: invitationDetails.email ?? '',
              };
              if (invitationDetails.firstName !== undefined) {
                fallbackPayload.firstName = invitationDetails.firstName;
              }
              if (invitationDetails.lastName !== undefined) {
                fallbackPayload.lastName = invitationDetails.lastName;
              }
              sessionStorage.setItem(ACCEPTANCE_CACHE_KEY, JSON.stringify(fallbackPayload));
            }
          } else {
            const payload: StoredInvitationAcceptance = {
              token: invitationDetails.token,
              invitationId: '',
              email: invitationDetails.email ?? '',
            };
            if (invitationDetails.firstName !== undefined) {
              payload.firstName = invitationDetails.firstName;
            }
            if (invitationDetails.lastName !== undefined) {
              payload.lastName = invitationDetails.lastName;
            }
            sessionStorage.setItem(ACCEPTANCE_CACHE_KEY, JSON.stringify(payload));
          }
        } catch (storageError) {
          console.warn('[signup-guard] failed to persist invitation details', storageError);
        }
      }

      const invitationTokenInQuery = Boolean(invitationDetails);

      const hasAcceptanceCache = (() => {
        if (typeof window === 'undefined') {
          return false;
        }
        try {
          return Boolean(sessionStorage.getItem(ACCEPTANCE_CACHE_KEY));
        } catch {
          return false;
        }
      })();

      try {
        const response = await fetchPublicSettings();

        if (cancelled) return;

        if (!response.inviteOnly || hasAcceptanceCache || invitationTokenInQuery) {
          setGuardState({ status: 'allow' });
          return;
        }

        setGuardState({ status: 'redirect', target: '/invite-only' });
      } catch (error) {
        console.warn('[signup-guard] failed to load settings, allowing access by default', error);
        if (!cancelled) {
          setGuardState({ status: 'allow' });
        }
      }
    };

    evaluateGuard();

    return () => {
      cancelled = true;
    };
  }, [location.search]);

  if (guardState.status === 'loading') {
    return null;
  }

  if (guardState.status === 'redirect') {
    return <Navigate to={guardState.target} replace />;
  }

  return <>{children}</>;
}
