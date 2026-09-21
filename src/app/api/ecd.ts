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
    store: string | null;
    linkedinUrl: string | null;
    facebookUrl: string | null;
    accessibilityNeeds: string | null;
    newsOptIn: boolean;
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

// ——— Content CMS ———

export type EcdPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  sortOrder: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EcdSpeaker = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  photoUrl: string | null;
  roomIndex: number;
  speakerType: string | null;
  statusTag: string | null;
  expertise: string[];
  sessionTitle: string | null;
  sessionLabel: string | null;
  proof: string | null;
  featured: boolean;
  featuredSortOrder: number;
  sortOrder: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EcdPackageFeature = {
  id?: string;
  kind: 'included' | 'excluded';
  label: string;
  emphasis: boolean;
  sortOrder: number;
};

export type EcdTicketPackage = {
  ticketType: 'ct' | 'fj';
  displayName: string;
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  badge: string | null;
  ctaLabel: string;
  priceCents: number;
  priceEgp: number;
  features: EcdPackageFeature[];
};

export type EcdPartnerInput = {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  sortOrder?: number;
  published?: boolean;
};

export type EcdSpeakerInput = {
  name: string;
  role?: string | null;
  company?: string | null;
  photoUrl?: string | null;
  roomIndex?: number;
  speakerType?: 'Founder' | 'Operator' | 'Executive' | 'Specialist' | null;
  statusTag?: string | null;
  expertise?: string[];
  sessionTitle?: string | null;
  sessionLabel?: string | null;
  proof?: string | null;
  featured?: boolean;
  featuredSortOrder?: number;
  sortOrder?: number;
  published?: boolean;
};

export type EcdPackageUpdateInput = {
  displayName: string;
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  badge?: string | null;
  ctaLabel: string;
  priceEgp: number;
  features: Array<{
    kind: 'included' | 'excluded';
    label: string;
    emphasis?: boolean;
    sortOrder?: number;
  }>;
};

export async function fetchEcdPartners() {
  const response = await fetchJson<{ data: { items: EcdPartner[] } }>(
    `${API_BASE}/ecd/admin/partners`,
    { method: 'GET' },
  );
  return response.data.items;
}

export async function createEcdPartner(input: EcdPartnerInput) {
  const response = await fetchJson<{ data: { partner: EcdPartner } }>(
    `${API_BASE}/ecd/admin/partners`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.partner;
}

export async function updateEcdPartner(id: string, input: EcdPartnerInput) {
  const response = await fetchJson<{ data: { partner: EcdPartner } }>(
    `${API_BASE}/ecd/admin/partners/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data.partner;
}

export async function deleteEcdPartner(id: string) {
  await fetchJson(`${API_BASE}/ecd/admin/partners/${id}`, { method: 'DELETE' });
}

export async function fetchEcdSpeakers() {
  const response = await fetchJson<{ data: { items: EcdSpeaker[] } }>(
    `${API_BASE}/ecd/admin/speakers`,
    { method: 'GET' },
  );
  return response.data.items;
}

export async function createEcdSpeaker(input: EcdSpeakerInput) {
  const response = await fetchJson<{ data: { speaker: EcdSpeaker } }>(
    `${API_BASE}/ecd/admin/speakers`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.speaker;
}

export async function updateEcdSpeaker(id: string, input: EcdSpeakerInput) {
  const response = await fetchJson<{ data: { speaker: EcdSpeaker } }>(
    `${API_BASE}/ecd/admin/speakers/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data.speaker;
}

export async function deleteEcdSpeaker(id: string) {
  await fetchJson(`${API_BASE}/ecd/admin/speakers/${id}`, { method: 'DELETE' });
}

export async function fetchEcdPackages() {
  const response = await fetchJson<{
    data: { packages: { ct: EcdTicketPackage | null; fj: EcdTicketPackage | null } };
  }>(`${API_BASE}/ecd/admin/packages`, { method: 'GET' });
  return response.data.packages;
}

export async function updateEcdPackage(ticketType: 'ct' | 'fj', input: EcdPackageUpdateInput) {
  const response = await fetchJson<{ data: { package: EcdTicketPackage } }>(
    `${API_BASE}/ecd/admin/packages/${ticketType}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data.package;
}
