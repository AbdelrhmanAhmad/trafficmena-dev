import { format } from 'date-fns';
import { Calendar, Loader2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/shared/components/layout/Header';
import { useSignUpContext } from '@/shared/components/layout/SignUpLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { getPendingEventContext } from '@/shared/utils/eventRedirectUtils';

const Step0: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { formData, updateFormData, resetForm } = useSignUpContext();
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const [eventContext, setEventContext] = useState(getPendingEventContext());
  const [acceptanceDetails] = useState<{
    token: string;
    invitationId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    userId?: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('trafficmena:invitation-acceptance');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid invitation acceptance cache', error);
      return null;
    }
  });

  const invitationToken = searchParams.get('invitation');

  useEffect(() => {
    if (!invitationToken) return;
    updateFormData({ invitationToken });

    if (!acceptanceDetails || acceptanceDetails.token !== invitationToken) {
      return;
    }

    const next: Partial<typeof formData> = {};
    if (!formData.email) {
      next.email = acceptanceDetails.email;
    }
    if (!formData.firstName && acceptanceDetails.firstName) {
      next.firstName = acceptanceDetails.firstName;
    }
    if (!formData.lastName && acceptanceDetails.lastName) {
      next.lastName = acceptanceDetails.lastName;
    }
    if (!formData.invitationUserId && acceptanceDetails.userId) {
      next.invitationUserId = acceptanceDetails.userId;
    }

    if (Object.keys(next).length > 0) {
      updateFormData(next);
    }
  }, [
    acceptanceDetails,
    formData.email,
    formData.firstName,
    formData.invitationUserId,
    formData.lastName,
    invitationToken,
    updateFormData,
  ]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [loading, user, navigate]);

  const handleEmailSignUp = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/signup/step-1');
    }, 150);
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-neutral-50">
      <Header />

      <div className="pointer-events-none absolute -left-[45vw] top-[-30vh] -z-10 h-[55vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/60 via-[#f4fff9]/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-[48vw] bottom-[-35vh] -z-10 h-[60vh] w-[82vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[140px]" />

      <div className="relative py-16">
        <div className="container mx-auto max-w-xl px-4">
          <div className="rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_18px_50px_-20px_rgba(16,16,16,0.35)] backdrop-blur">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600">
                Start your journey
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900">
                Join the heart of marketing in MENA
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Connect with experts, master new skills, and accelerate your career.
              </p>
            </div>

            {invitationToken && !eventContext && (
              <Card className="mb-6 rounded-2xl border-blue-200 bg-blue-50/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    Invitation Detected
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700">
                      Token:{' '}
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {invitationToken}
                      </Badge>
                    </p>
                    {acceptanceDetails?.email ? (
                      <>
                        <p className="text-sm text-blue-600">
                          Invitation confirmed for {acceptanceDetails.email}.
                        </p>
                        <p className="text-sm text-blue-600">
                          We pre-filled your details and sent a one-time passcode to your inbox to
                          finish signup.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-blue-600">
                        Continue with signup and our team will verify your invitation manually
                        during the MVP.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {eventContext && (
              <Card className="mb-6 rounded-2xl border-green-200 bg-green-50/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-green-900">
                    <Calendar className="h-5 w-5" />
                    You're signing up to join this event
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-900">{eventContext.eventTitle}</h3>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(eventContext.eventDate), 'MMMM d, yyyy • h:mm a')}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-green-600">
                    Complete your signup to secure your spot at this event!
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-6">
              <Button
                onClick={handleEmailSignUp}
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 font-medium text-neutral-800 transition-all duration-300 hover:bg-neutral-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  'Continue with email'
                )}
              </Button>

              <div className="space-y-2 text-center text-sm text-neutral-600">
                <p>Prefer quick access?</p>
                <Button
                  variant="ghost"
                  className="w-full text-[#05ef62] hover:text-[#29cf9f]"
                  onClick={() => navigate('/signin')}
                >
                  Already a member? Sign in
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step0;
