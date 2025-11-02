import { Mail } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/shared/components/layout/Header';
import { Button } from '@/shared/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/shared/components/ui/input-otp';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { persistSignupProfile } from './persistProfile';

const CheckEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const { verifyOtp, requestOtp, user } = useAuth();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/signup/step-2');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      return;
    }

    if (code.trim().length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Enter the 6-digit code we emailed you.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOtp({ email, otp: code.trim() });
      await persistSignupProfile();
      toast({
        title: 'Welcome to TrafficMENA',
        description: 'You are now signed in.',
      });
      navigate('/dashboard');
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Code verification failed',
        description: appError.message || 'Please try again with a fresh code.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      return;
    }
    setIsResending(true);
    try {
      await requestOtp(email);
      toast({
        title: 'New code sent',
        description: 'Check your inbox. Codes expire in 10 minutes.',
      });
    } catch (error) {
      const appError = handleError(error);
      toast({
        title: 'Unable to resend code',
        description: appError.message || 'Wait a moment before trying again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="py-16">
        <div className="container mx-auto max-w-md px-4">
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-green/10">
                <Mail className="h-8 w-8 text-primary-green" />
              </div>
            </div>

            <h1 className="mb-4 text-2xl font-bold text-primary">Check your email</h1>

            <p className="mb-6 text-gray-600">
              We sent a login code to <span className="font-medium text-primary">{email}</span>
            </p>

            <p className="mb-8 text-sm text-gray-500">
              Enter the 6-digit code to finish setting up your account. Codes expire in 10 minutes
              and you can request a new one up to 3 times.
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                containerClassName="justify-center"
                aria-label="One-time password"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <Button
                type="submit"
                disabled={isVerifying || code.trim().length !== 6}
                className="w-full bg-gradient-to-r from-primary-green to-primary-gradient text-white hover:from-primary-gradient hover:to-secondary-teal"
              >
                {isVerifying ? 'Verifying…' : 'Verify and continue'}
              </Button>
            </form>

            <div className="mt-4 space-y-4 text-sm text-gray-600">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full text-primary transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {isResending ? 'Sending new code…' : 'Resend code'}
              </button>

              <Button
                onClick={() => navigate('/signup/step-2')}
                variant="outline"
                className="w-full"
              >
                Back to Login Options
              </Button>

              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-primary-green to-primary-gradient text-white hover:from-primary-gradient hover:to-secondary-teal"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;
