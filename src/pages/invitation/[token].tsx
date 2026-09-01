import { CheckCircle2, Mail, ShieldAlert } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');
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
        title: t('invitation.errors.missingDetailsTitle'),
        description: t('invitation.errors.missingDetailsDesc'),
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
          title: t('invitation.toast.alreadyAcceptedTitle'),
          description: t('invitation.toast.alreadyAcceptedDesc'),
        });
      } else {
        toast({
          title: t('invitation.toast.confirmedTitle'),
          description: t('invitation.toast.confirmedDesc'),
        });
      }

      setState('accepted');
    } catch (error) {
      const detail =
        (error as { message?: string })?.message ?? t('invitation.errors.validateFailed');
      toast({
        title: t('invitation.errors.acceptFailedTitle'),
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
              {state === 'accepted'
                ? t('invitation.titleConfirmed')
                : t('invitation.titleConfirm')}
            </CardTitle>
            <CardDescription>
              {isTokenMissing
                ? t('invitation.descMissingToken')
                : t('invitation.descDefault')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTokenMissing ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium">{t('invitation.missingTokenTitle')}</p>
                    <p className="mt-1">{t('invitation.missingTokenBody')}</p>
                  </div>
                </div>
                <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate('/')}>
                  {t('invitation.returnHome')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor={emailInputId}>{t('emailLabel')}</Label>
                    <Input
                      id={emailInputId}
                      type="email"
                      value={email}
                      autoComplete="email"
                      placeholder={t('invitation.inviteEmailPlaceholder')}
                      onChange={(event) => setEmail(event.target.value.toLowerCase())}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 text-left">
                      <Label htmlFor={firstNameInputId}>{t('invitation.firstNameOptional')}</Label>
                      <Input
                        id={firstNameInputId}
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder={t('invitation.firstNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor={lastNameInputId}>{t('invitation.lastNameOptional')}</Label>
                      <Input
                        id={lastNameInputId}
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder={t('invitation.lastNamePlaceholder')}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{t('invitation.onboardingNote')}</p>
                  <p className="text-xs text-muted-foreground">{t('invitation.resendNote')}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    disabled={disabledAcceptButton}
                    onClick={state === 'accepted' ? handleContinue : handleAccept}
                  >
                    {state === 'accepted'
                      ? t('invitation.continueToSignup')
                      : isSubmitting
                        ? t('invitation.confirming')
                        : t('invitation.confirmButton')}
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
