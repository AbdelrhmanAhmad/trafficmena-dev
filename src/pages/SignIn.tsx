import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, type Location, useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, requestOtp, verifyOtp, refreshSession } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, user, navigate, redirectTo]);

  const requestLoginCode = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await requestOtp(email.trim().toLowerCase());
      toast({
        title: 'Check your inbox',
        description: 'We sent you a 6-digit code to sign in.',
      });
      setStep('verify');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send login code.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestLoginCode();
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !otp.trim()) {
      setErrorMessage('Enter your email and the code you received.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() });
      await refreshSession();
      toast({ title: 'Welcome back!', description: 'You are now signed in.' });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid or expired code.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold text-primary">Welcome Back!</h2>
              <p className="text-gray-600">Sign in to your TrafficMENA account</p>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient py-3 font-semibold text-white transition-all duration-300 hover:from-primary-gradient hover:to-secondary-teal"
                >
                  {isSubmitting ? 'Sending code…' : 'Send login code'}
                </Button>

                <p className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup/step-0"
                    className="font-medium text-primary hover:text-primary-green"
                  >
                    Join TrafficMENA
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <Label htmlFor="otp-email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="otp-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                    6-digit Code
                  </Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Enter the code you received"
                    className="mt-1 tracking-[0.3em] text-center text-lg"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || otp.trim().length === 0}
                  className="w-full rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient py-3 font-semibold text-white transition-all duration-300 hover:from-primary-gradient hover:to-secondary-teal"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify and sign in'}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  Didn&apos;t get the code?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:text-primary-green"
                    onClick={requestLoginCode}
                    disabled={isSubmitting}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SignIn;
