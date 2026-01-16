import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVerifyPayment } from '@/app/hooks/usePayments';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const verifyPayment = useVerifyPayment();
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    if (invoiceId && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyPayment.mutate({ invoiceId: Number(invoiceId) });
    }
  }, [invoiceId, verificationAttempted, verifyPayment]);

  const isVerifying = verifyPayment.isPending;
  const isSuccess = verifyPayment.data?.status === 'paid';
  const isError =
    verifyPayment.isError || (verifyPayment.data && verifyPayment.data.status !== 'paid');

  return (
    <AppLayout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="text-center">
            {isVerifying && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Verifying Payment...</CardTitle>
                <CardDescription>Please wait while we confirm your payment.</CardDescription>
              </>
            )}

            {isSuccess && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
                <CardDescription>
                  {verifyPayment.data?.itemName
                    ? `Your purchase of "${verifyPayment.data.itemName}" is complete.`
                    : 'Your payment has been processed successfully.'}
                </CardDescription>
              </>
            )}

            {isError && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <CheckCircle2 className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-700">Payment Processing</CardTitle>
                <CardDescription>
                  Your payment may still be processing. Please check your dashboard for the latest
                  status.
                </CardDescription>
              </>
            )}

            {!invoiceId && !isVerifying && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Thank You!</CardTitle>
                <CardDescription>Your transaction has been received.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/meetups">View My Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
