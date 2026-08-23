import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVerifyPayment } from '@/app/hooks/usePayments';
import {
  clearCheckoutReturn,
  readCheckoutReturn,
} from '@/shared/utils/paymentReturnContext';

/** Legacy helper — prefer inline paymentId verify in pending/success pages. */
export function usePaymentVerification(user: { id: string } | null, authLoading: boolean) {
  const [searchParams] = useSearchParams();
  const verifyPayment = useVerifyPayment();
  const verificationAttemptedRef = useRef(false);

  const paymentIdFromUrl = searchParams.get('payment_id');
  const storedReturn = useMemo(() => readCheckoutReturn(), []);
  const paymentId = paymentIdFromUrl ?? storedReturn?.paymentId ?? null;

  useEffect(() => {
    if (authLoading || !user || !paymentId || verificationAttemptedRef.current) {
      return;
    }

    verificationAttemptedRef.current = true;
    verifyPayment.mutate({ paymentId });
  }, [authLoading, user, paymentId, verifyPayment]);

  useEffect(() => {
    if (verifyPayment.data?.status === 'paid') {
      clearCheckoutReturn();
    }
  }, [verifyPayment.data?.status]);

  return {
    verifyPayment,
    paymentId,
    hasPaymentContext: Boolean(paymentId),
  };
}
