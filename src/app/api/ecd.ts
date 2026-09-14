import { API_BASE, fetchJson } from '@/app/api/client';

export type EcdTicketRow = {
  id: string;
  bookingId: string;
  serial: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
};

export type EcdRegistrationListItem = {
  id: string;
  orderCode: string;
  ticketType: 'ct' | 'fj';
  ticketName: string;
  qty: number;
  totalCents: number;
  amountFormatted: string;
  paymentStatus: string;
  buyerName: string;
  buyerEmail: string;
  buyerMobile: string | null;
  promoCode: string | null;
  paidAt: string | null;
  createdAt: string;
  userId: string;
  serials: string[];
  tickets: EcdTicketRow[];
  form: {
    company: string | null;
    jobTitle: string | null;
    country: string | null;
    needInvoice: boolean;
    invoiceCompany: string | null;
    taxId: string | null;
    billingAddress: string | null;
  } | null;
};

export type EcdRegistrationsResponse = {
  items: EcdRegistrationListItem[];
  pagination: { page: number; pageSize: number; total: number };
};

export async function fetchEcdRegistrations(params: {
  q?: string;
  ticketType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<EcdRegistrationsResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.ticketType) search.set('ticketType', params.ticketType);
  if (params.status) search.set('status', params.status);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  const response = await fetchJson<{ data: EcdRegistrationsResponse }>(
    `${API_BASE}/ecd/admin/registrations${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
  return response.data;
}

export async function updateEcdTicketEmail(ticketId: string, attendeeEmail: string) {
  const response = await fetchJson<{ data: { ticket: EcdTicketRow } }>(
    `${API_BASE}/ecd/admin/tickets/${ticketId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ attendeeEmail }),
    },
  );
  return response.data.ticket;
}

export async function sendEcdTicketEmail(ticketId: string, attendeeEmail?: string) {
  const response = await fetchJson<{ data: { sent: boolean; email: string; serial: string } }>(
    `${API_BASE}/ecd/admin/tickets/${ticketId}/send-email`,
    {
      method: 'POST',
      body: JSON.stringify(attendeeEmail ? { attendeeEmail } : {}),
    },
  );
  return response.data;
}
