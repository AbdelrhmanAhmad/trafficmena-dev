import { Clock, Loader2 } from 'lucide-react';
import * as QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/app/api/client';
import type { PaymentItemType } from '@/app/api/payments';
import {
  useCreateCheckout,
  usePayment,
  usePaymentMethods,
  useVerifyPayment,
} from '@/app/hooks/usePayments';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { rememberCheckoutReturn } from '@/shared/utils/paymentReturnContext';
import { shouldRedirectToGateway } from '@/shared/utils/paymentMethods';

function createCheckoutIdempotencyKey(scope: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${scope}:${crypto.randomUUID()}`;
  }
  return `${scope}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export default function PaymentPendingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const verifyPayment = useVerifyPayment();
  const createCheckout = useCreateCheckout();
  const requestNewCodeLockRef = useRef(false);
  const paymentIdParam = searchParams.get('payment_id');
  const paymentId = user ? (paymentIdParam ?? undefined) : undefined;
  const { data: payment, refetch: refetchPayment } = usePayment(paymentId);
  const rawMeezaQrCode = payment?.meezaQrCode ?? undefined;
  const maxMeezaQrLength = 2048;
  const meezaQrCode =
    rawMeezaQrCode && rawMeezaQrCode.length <= maxMeezaQrLength ? rawMeezaQrCode : undefined;
  const isMeezaQrTooLarge = Boolean(rawMeezaQrCode && !meezaQrCode);
  const invoiceIdParam = searchParams.get('invoice_id');
  const invoiceId = invoiceIdParam ?? payment?.fawaterkInvoiceId ?? null;
  const itemTypeParam = searchParams.get('item_type');
  const itemType: PaymentItemType | null =
    itemTypeParam === 'event' ||
    itemTypeParam === 'track' ||
    itemTypeParam === 'subscription' ||
    itemTypeParam === 'order' ||
    itemTypeParam === 'masterclass'
      ? itemTypeParam
      : null;
  const itemId = searchParams.get('item_id') ?? undefined;
  const methodIdParam = searchParams.get('method_id');
  const paymentMethodId = methodIdParam ? Number(methodIdParam) : null;
  const isInvoiceIdValid = invoiceId !== null && invoiceId.trim().length > 0;
  const isMethodIdValid = paymentMethodId !== null && !Number.isNaN(paymentMethodId);
  const { data: methods } = usePaymentMethods({ enabled: !!user });
  const selectedMethod =
    isMethodIdValid && paymentMethodId
      ? (methods?.find((method) => method.paymentId === paymentMethodId) ?? null)
      : null;
  const shouldRedirect = shouldRedirectToGateway(selectedMethod);
  const hasItemContext = itemType && (itemType === 'subscription' || Boolean(itemId));
  const canRequestNewCode = Boolean(user && hasItemContext && isMethodIdValid);
  const canVerifyPayment = Boolean(user && isInvoiceIdValid);
  const [meezaQrDataUrl, setMeezaQrDataUrl] = useState<string | null>(null);

  const fawryCode = payment?.fawryCode ?? undefined;
  const amanCode = payment?.amanCode ?? undefined;
  const masaryCode = payment?.masaryCode ?? undefined;
  const meezaReference = payment?.meezaReference ?? undefined;
  const referenceCodes = [
    {
      key: 'fawry',
      label: 'Fawry code',
      code: fawryCode,
      instructions: 'Present this code at any Fawry outlet to complete your payment.',
    },
    {
      key: 'aman',
      label: 'Aman code',
      code: amanCode,
      instructions: 'Use this code at any Aman kiosk to complete your payment.',
    },
    {
      key: 'masary',
      label: 'Masary code',
      code: masaryCode,
      instructions: 'Provide this code at any Masary outlet to complete your payment.',
    },
    {
      key: 'meeza',
      label: 'Meeza reference',
      code: meezaReference,
      instructions: 'Use this reference in Meeza payment channels to complete your payment.',
    },
    {
      key: 'meeza-qr',
      label: 'Meeza QR payload',
      code: meezaQrCode,
      instructions: 'Scan this payload with your Meeza wallet to complete your payment.',
    },
  ];

  const availableCodes = referenceCodes.filter((entry) => entry.code);

  useEffect(() => {
    let isMounted = true;
    if (!meezaQrCode) {
      setMeezaQrDataUrl(null);
      return undefined;
    }

    QRCode.toDataURL(meezaQrCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
    })
      .then((url) => {
        if (isMounted) {
          setMeezaQrDataUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMeezaQrDataUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [meezaQrCode]);

  useEffect(() => {
    if (verifyPayment.data?.status === 'paid' && isInvoiceIdValid && invoiceId !== null) {
      const params = new URLSearchParams();
      params.set('invoice_id', invoiceId);
      if (paymentId) params.set('payment_id', paymentId);
      navigate(`/payment/success?${params.toString()}`);
    }
  }, [verifyPayment.data?.status, isInvoiceIdValid, invoiceId, paymentId, navigate]);

  const autoVerifyAttemptedRef = useRef(false);
  useEffect(() => {
    if (
      !user ||
      !isInvoiceIdValid ||
      invoiceId === null ||
      autoVerifyAttemptedRef.current ||
      verifyPayment.isPending ||
      verifyPayment.data?.status === 'paid'
    ) {
      return;
    }

    autoVerifyAttemptedRef.current = true;
    verifyPayment.mutate({ invoiceId });
  }, [user, isInvoiceIdValid, invoiceId, verifyPayment]);

  useEffect(() => {
    if (!paymentId || isInvoiceIdValid) {
      return undefined;
    }

    const pollTimer = setInterval(() => {
      void refetchPayment();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
    };
  }, [paymentId, isInvoiceIdValid, refetchPayment]);

  useEffect(() => {
    if (!paymentId || !isInvoiceIdValid || invoiceIdParam || invoiceId === null) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set('invoice_id', String(invoiceId));
    params.set('payment_id', paymentId);
    navigate(`/payment/pending?${params.toString()}`, {
      replace: true,
      state: undefined,
    });
  }, [paymentId, isInvoiceIdValid, invoiceIdParam, invoiceId, searchParams, navigate]);

  const handleVerify = () => {
    if (!user || !isInvoiceIdValid || invoiceId === null) return;
    verifyPayment.mutate({ invoiceId });
  };

  const goToPending = (payload: { invoiceId?: string; paymentId?: string }) => {
    const params = new URLSearchParams();
    if (payload.invoiceId) params.set('invoice_id', String(payload.invoiceId));
    if (itemType) params.set('item_type', itemType);
    if (itemId) params.set('item_id', itemId);
    if (isMethodIdValid && paymentMethodId) {
      params.set('method_id', String(paymentMethodId));
    }
    if (payload.paymentId) {
      params.set('payment_id', payload.paymentId);
    }
    const query = params.toString();
    navigate(`/payment/pending${query ? `?${query}` : ''}`, {
      replace: true,
      state: undefined,
    });
  };

  const handleRequestNewCode = async () => {
    if (!canRequestNewCode || !itemType || !isMethodIdValid || !paymentMethodId) {
      return;
    }

    if (itemType === 'order') {
      toast({
        title: 'Use series cart',
        description: 'Return to your series cart to start a new checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (itemType !== 'subscription' && !itemId) {
      return;
    }

    if (requestNewCodeLockRef.current) {
      return;
    }
    requestNewCodeLockRef.current = true;

    try {
      const result = await createCheckout.mutateAsync({
        itemType,
        itemId: itemType === 'subscription' ? undefined : itemId,
        paymentMethodId,
        forceNewCode: true,
        idempotencyKey: createCheckoutIdempotencyKey(
          `${itemType}:${itemId ?? 'subscription'}:${paymentMethodId}:replace`,
        ),
      });

      if (result.free) {
        navigate('/payment/success');
        return;
      }

      if (result.redirectUrl) {
        rememberCheckoutReturn({
          paymentId: result.paymentId,
          invoiceId: result.invoiceId,
          itemType,
        });
        window.location.href = result.redirectUrl;
        return;
      }

      if (
        result.invoiceId ||
        result.fawryCode ||
        result.meezaReference ||
        result.meezaQrCode ||
        result.amanCode ||
        result.masaryCode
      ) {
        goToPending({
          invoiceId: result.invoiceId,
          paymentId: result.paymentId,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PENDING_PAYMENT') {
        const invoiceId = error.extra?.invoiceId as string | undefined;
        const pendingPaymentId = error.extra?.paymentId as string | undefined;
        if (invoiceId || pendingPaymentId) {
          goToPending({ invoiceId, paymentId: pendingPaymentId });
          return;
        }
      }

      const message =
        error instanceof Error ? error.message : 'Unable to request a new code right now.';
      toast({
        title: 'Request failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      requestNewCodeLockRef.current = false;
    }
  };

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700">Payment Pending</CardTitle>
            <CardDescription>Your payment is being processed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableCodes.length > 0 ? (
              <div className="space-y-3">
                {availableCodes.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center"
                  >
                    <p className="text-sm text-muted-foreground">{entry.label}</p>
                    {entry.key === 'meeza-qr' && meezaQrDataUrl && (
                      <img
                        src={meezaQrDataUrl}
                        alt="Meeza QR code"
                        className="mx-auto mt-3 h-40 w-40 rounded-md border border-primary/20 bg-white p-2"
                      />
                    )}
                    <p
                      className={
                        entry.key === 'meeza-qr'
                          ? 'mt-2 break-all font-mono text-xs text-primary'
                          : 'mt-1 font-mono text-2xl font-bold text-primary'
                      }
                    >
                      {String(entry.code)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{entry.instructions}</p>
                  </div>
                ))}
                {isMeezaQrTooLarge && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Meeza QR payload is too large to render. Please request a new code.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                {shouldRedirect ? (
                  <>
                    Your payment code is generated on the Fawaterk page. If you already generated a
                    code, complete the payment and then check the status here. If you haven&apos;t
                    generated a code yet, click &quot;Request new code&quot; to open Fawaterk again.
                  </>
                ) : (
                  'Your payment is being verified. This may take a few moments. You will receive a confirmation once the payment is complete.'
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={!canVerifyPayment || verifyPayment.isPending}
              >
                {verifyPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check payment status
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestNewCode}
                disabled={!canRequestNewCode || createCheckout.isPending}
              >
                {createCheckout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request new code
              </Button>
              {canRequestNewCode && (
                <p className="text-center text-xs text-muted-foreground">
                  Requesting a new code replaces the current pending invoice.
                </p>
              )}
              {!canRequestNewCode && (
                <p className="text-center text-xs text-muted-foreground">
                  {user
                    ? 'Start a new checkout to get a fresh reference code.'
                    : 'Sign in to check status or request a new code.'}
                </p>
              )}
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
    </Layout>
  );
}
