export type InvoiceStatusInput = {
  paid: number;
  paid_at: string | null;
};

export function isInvoicePaid(invoice: InvoiceStatusInput | null | undefined): boolean {
  if (!invoice) return false;
  return invoice.paid === 1;
}
