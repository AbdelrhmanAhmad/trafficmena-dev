import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePayment, useVerifyPayment } from '@/app/hooks/usePayments';
import {
  clearCheckoutReturn,
  readCheckoutReturn,
} from '@/shared/utils/paymentReturnContext';

export function usePaymentVerification(user: { id: string } | null, authLoading: boolean) {
  const [searchParams] = useSearchParams();
  const verifyPayment = useVerifyPayment();
  const verificationAttemptedRef = useRef(false);

  const invoiceFromUrl =
    searchParams.get('invoice_id') ??
    searchParams.get('intent_key') ??
    searchParams.get('InvoiceId');

  const paymentIdFromUrl = searchParams.get('payment_id');
  const storedReturn = useMemo(() => readCheckoutReturn(), []);
  const paymentIdForLookup =
    paymentIdFromUrl ?? storedReturn?.paymentId ?? undefined;

  const { data: paymentFromId } = usePayment(
    user && paymentIdForLookup && !invoiceFromUrl ? paymentIdForLookup : undefined,
  );

  const resolvedInvoiceId =
    invoiceFromUrl ??
    paymentFromId?.fawaterkInvoiceId ??
    storedReturn?.invoiceId ??
    null;

  useEffect(() => {
    if (authLoading || !user || !resolvedInvoiceId || verificationAttemptedRef.current) {
      return;
    }

    verificationAttemptedRef.current = true;
    verifyPayment.mutate({ invoiceId: resolvedInvoiceId });
  }, [authLoading, user, resolvedInvoiceId, verifyPayment]);

  useEffect(() => {
    if (verifyPayment.data?.status === 'paid') {
      clearCheckoutReturn();
    }
  }, [verifyPayment.data?.status]);

  return {
    verifyPayment,
    resolvedInvoiceId,
    paymentIdForLookup,
    hasInvoiceContext: Boolean(resolvedInvoiceId || paymentIdForLookup),
  };
}
