import { CheckCircle2, Mail, ShieldAlert } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAcceptInvitation } from '@/app/hooks/useInvitations';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/custom/use-toast';

type AcceptanceState = 'idle' | 'accepted';

type StoredAcceptance = {
  token: string;
  invitationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string;
};

export default function InvitationAcceptancePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const acceptInvitation = useAcceptInvitation();

  const [email, setEmail] = useState(() => searchParams.get('email')?.toLowerCase() ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [state, setState] = useState<AcceptanceState>('idle');

  const isSubmitting = acceptInvitation.isPending;
  const invitationToken = useMemo(
    () => token ?? searchParams.get('invitation') ?? '',
    [token, searchParams],
  );
  const isTokenMissing = !invitationToken;
  const emailInputId = useId();
  const firstNameInputId = useId();
  const lastNameInputId = useId();

  useEffect(() => {
    if (!invitationToken || typeof window === 'undefined') return;
    sessionStorage.setItem('trafficmena:last-invitation-token', invitationToken);
  }, [invitationToken]);

  const persistAcceptance = (payload: StoredAcceptance) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('trafficmena:invitation-acceptance', JSON.stringify(payload));
  };

  const handleAccept = async () => {
    if (!invitationToken || !email) {
      toast({
        title: 'Missing details',
        description: 'Make sure the invitation link includes an email address.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await acceptInvitation.mutateAsync({
        token: invitationToken,
        email,
        firstName: firstName.trim() ? firstName.trim() : undefined,
        lastName: lastName.trim() ? lastName.trim() : undefined,
      });

      persistAcceptance({
        token: invitationToken,
        invitationId: response.invitation.id,
        email: response.invitation.email,
        firstName: response.invitation.firstName,
        lastName: response.invitation.lastName,
        userId: response.userId,
      });

      setEmail(response.invitation.email);
      if (response.invitation.firstName) {
        setFirstName(response.invitation.firstName);
      }
      if (response.invitation.lastName) {
        setLastName(response.invitation.lastName);
      }

      if (response.alreadyAccepted) {
        toast({
          title: 'Invitation already accepted',
          description: 'You can continue with signup using the same email address.',
        });
      } else {
        toast({
          title: 'Invitation confirmed',
          description: 'Great! We emailed you a one-time passcode to continue signup.',
        });
      }

      setState('accepted');
    } catch (error) {
      const detail =
        (error as { message?: string })?.message ?? 'We could not validate this invite.';
      toast({
        title: 'Unable to accept invitation',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const handleContinue = () => {
    if (!invitationToken) {
      navigate('/signup');
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('trafficmena:invitation-auto-continue', '1');
      } catch (error) {
        console.warn('[invitation] unable to persist auto-continue flag', error);
      }
    }
    const params = new URLSearchParams({ invitation: invitationToken, email });
    if (firstName.trim()) params.set('firstName', firstName.trim());
    if (lastName.trim()) params.set('lastName', lastName.trim());
    navigate(`/signup?${params.toString()}`);
  };

  const disabledAcceptButton = isTokenMissing || !email || isSubmitting;

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              {state === 'accepted' ? (
                <CheckCircle2 className="h-7 w-7 text-primary" />
              ) : (
                <Mail className="h-7 w-7 text-primary" />
              )}
            </div>
            <CardTitle className="text-primary">
              {state === 'accepted' ? 'Invitation confirmed' : 'Confirm your invitation'}
            </CardTitle>
            <CardDescription>
              {isTokenMissing
                ? 'This link is missing its invitation token. Double-check the email we sent you.'
                : 'We use your invitation code to fast-track signup and unlock member access.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTokenMissing ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium">Missing invitation token</p>
                    <p className="mt-1">
                      Head back to your email and click the latest invite link. The URL should
                      include a token parameter.
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate('/')}>
                  Return home
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor={emailInputId}>Email</Label>
                    <Input
                      id={emailInputId}
                      type="email"
                      value={email}
                      autoComplete="email"
                      placeholder="you@example.com"
                      onChange={(event) => setEmail(event.target.value.toLowerCase())}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 text-left">
                      <Label htmlFor={firstNameInputId}>First name (optional)</Label>
                      <Input
                        id={firstNameInputId}
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="Ranya"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor={lastNameInputId}>Last name (optional)</Label>
                      <Input
                        id={lastNameInputId}
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="El Haddad"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    We will mark your invitation as accepted and guide you through the seven-step
                    onboarding to finish your profile.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Need a new link? Ask the TrafficMENA team to resend your invite from the admin
                    dashboard.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    disabled={disabledAcceptButton}
                    onClick={state === 'accepted' ? handleContinue : handleAccept}
                  >
                    {state === 'accepted'
                      ? 'Continue to signup'
                      : isSubmitting
                        ? 'Confirming invitation…'
                        : 'Confirm invitation'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
