import { Clock, Loader2 } from 'lucide-react';
import * as QRCode from 'qrcode';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/app/api/client';
import type { PaymentItemType } from '@/app/api/payments';
import { useCreateCheckout, usePayment, useVerifyPayment } from '@/app/hooks/usePayments';
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

function createCheckoutIdempotencyKey(scope: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${scope}:${crypto.randomUUID()}`;
  }
  return `${scope}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

export default function PaymentPendingPage() {
  const { t } = useTranslation('payments');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const verifyPayment = useVerifyPayment();
  const createCheckout = useCreateCheckout();
  const requestNewCodeLockRef = useRef(false);
  // paymentId (our UUID) is the sole flow key — it exists from checkout even in gateway crash windows.
  const paymentIdParam = searchParams.get('payment_id');
  const paymentId = user ? (paymentIdParam ?? undefined) : undefined;
  const { data: payment } = usePayment(paymentId);
  const status = payment?.status;

  const rawMeezaQrCode = payment?.meezaQrCode ?? undefined;
  const maxMeezaQrLength = 2048;
  const meezaQrCode =
    rawMeezaQrCode && rawMeezaQrCode.length <= maxMeezaQrLength ? rawMeezaQrCode : undefined;
  const isMeezaQrTooLarge = Boolean(rawMeezaQrCode && !meezaQrCode);
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
  const isMethodIdValid = paymentMethodId !== null && !Number.isNaN(paymentMethodId);
  const hasItemContext = itemType && (itemType === 'subscription' || Boolean(itemId));
  const canRequestNewCode = Boolean(user && hasItemContext && isMethodIdValid);
  const canVerifyPayment = Boolean(user && paymentId);
  const [meezaQrDataUrl, setMeezaQrDataUrl] = useState<string | null>(null);

  const fawryCode = payment?.fawryCode ?? undefined;
  const amanCode = payment?.amanCode ?? undefined;
  const masaryCode = payment?.masaryCode ?? undefined;
  const meezaReference = payment?.meezaReference ?? undefined;
  const referenceCodes = [
    {
      key: 'fawry',
      label: t('fawryCode'),
      code: fawryCode,
      instructions: t('fawryInstructions'),
    },
    {
      key: 'aman',
      label: t('amanCode'),
      code: amanCode,
      instructions: t('amanInstructions'),
    },
    {
      key: 'masary',
      label: t('masaryCode'),
      code: masaryCode,
      instructions: t('masaryInstructions'),
    },
    {
      key: 'meeza',
      label: t('walletReference'),
      code: meezaReference,
      instructions: t('walletInstructions'),
    },
    {
      key: 'meeza-qr',
      label: t('walletQr'),
      code: meezaQrCode,
      instructions: t('walletQrInstructions'),
    },
  ];

  const availableCodes = referenceCodes.filter((entry) => entry.code);
  // Status-driven states: dead intents must not present a redeemable code; an action-less pending
  // (undocumented method shape) must prompt action rather than read as "wait for confirmation".
  const isTerminated = status === 'expired' || status === 'failed';
  const showCodes = status === 'pending' && availableCodes.length > 0;
  const isActionlessPending = status === 'pending' && availableCodes.length === 0;

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
    const paid = status === 'paid' || verifyPayment.data?.status === 'paid';
    if (paid && paymentId) {
      navigate(`/payment/success?payment_id=${paymentId}`);
    }
  }, [status, verifyPayment.data?.status, paymentId, navigate]);

  const handleVerify = () => {
    if (!(user && paymentId)) {
      return;
    }
    verifyPayment.mutate({ paymentId });
  };

  const goToPending = (payload: { paymentId?: string }) => {
    const params = new URLSearchParams();
    if (itemType) {
      params.set('item_type', itemType);
    }
    if (itemId) {
      params.set('item_id', itemId);
    }
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
        ticketType: payment?.ticketType ?? undefined,
        idempotencyKey: createCheckoutIdempotencyKey(
          `${itemType}:${itemId ?? 'subscription'}:${paymentMethodId}:replace`,
        ),
      });

      if (result.free) {
        navigate('/payment/success');
        return;
      }

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      // Reference codes or an undocumented shape → land on the pending page for the new intent.
      goToPending({ paymentId: result.paymentId });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PENDING_PAYMENT') {
        const pendingPaymentId = error.extra?.paymentId as string | undefined;
        if (pendingPaymentId) {
          goToPending({ paymentId: pendingPaymentId });
          return;
        }
      }

      const message =
        error instanceof Error ? error.message : t('requestFailedDesc');
      toast({
        title: t('requestFailed'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      requestNewCodeLockRef.current = false;
    }
  };

  let bodyContent: ReactNode;
  if (isTerminated) {
    bodyContent = (
      <div className="rounded-lg border border-neutral-200 bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        {t('sessionExpired')}
      </div>
    );
  } else if (showCodes) {
    bodyContent = (
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
                alt={t('walletQrAlt')}
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
            {t('walletQrTooLarge')}
          </div>
        )}
      </div>
    );
  } else if (isActionlessPending) {
    bodyContent = (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
        {t('actionlessPending')}
      </div>
    );
  } else {
    bodyContent = (
      <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        {t('verifyingStatus')}
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700">{t('pendingTitle')}</CardTitle>
            <CardDescription>{t('pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bodyContent}

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={!canVerifyPayment || verifyPayment.isPending}
              >
                {verifyPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('checkStatus')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestNewCode}
                disabled={!canRequestNewCode || createCheckout.isPending}
              >
                {createCheckout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('requestNewCode')}
              </Button>
              {canRequestNewCode && (
                <p className="text-center text-xs text-muted-foreground">
                  {t('requestNewCodeHint')}
                </p>
              )}
              {!canRequestNewCode && (
                <p className="text-center text-xs text-muted-foreground">
                  {user ? t('startNewCheckout') : t('signInForCode')}
                </p>
              )}
              <Button asChild className="w-full">
                <Link to="/dashboard">{t('goToDashboard')}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard/meetups">{t('viewMyEvents')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
