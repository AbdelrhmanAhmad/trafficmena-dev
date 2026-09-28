import { API_BASE, fetchJson } from '@/app/api/client';

export type EcdTicketRow = {
  id: string;
  bookingId: string;
  serial: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
};

export type EcdWorkshopReservation = {
  id: string;
  sessionId: string;
  slug: string;
  title: string;
  trackIndex: number;
  timeLabel: string;
  sessionCheckedInAt: string | null;
};

export type EcdRegistrationListItem = {
  id: string;
  orderCode: string;
  ticketType: 'ct' | 'fj';
  ticketName: string;
  qty: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  amountFormatted: string;
  unitPriceFormatted?: string;
  discountFormatted?: string;
  paymentStatus: string;
  buyerName: string;
  buyerEmail: string;
  buyerMobile: string | null;
  promoCode: string | null;
  registrationSource?: 'website' | 'manual' | string;
  grantReason?: string | null;
  isComplimentary?: boolean;
  paidAt: string | null;
  venueCheckedInAt: string | null;
  attendeeFrameUrl?: string | null;
  bookingPageUrl?: string;
  createdAt: string;
  userId: string;
  serials: string[];
  tickets: EcdTicketRow[];
  workshops: EcdWorkshopReservation[];
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
  source?: string;
  grantReason?: string;
  page?: number;
  pageSize?: number;
}): Promise<EcdRegistrationsResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.ticketType) search.set('ticketType', params.ticketType);
  if (params.status) search.set('status', params.status);
  if (params.source) search.set('source', params.source);
  if (params.grantReason) search.set('grantReason', params.grantReason);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  const response = await fetchJson<{ data: EcdRegistrationsResponse }>(
    `${API_BASE}/ecd/admin/registrations${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
  return response.data;
}

export async function createEcdManualRegistration(payload: {
  name: string;
  email: string;
  phone: string;
  ticketType: 'ct' | 'fj';
  isComplimentary: boolean;
  grantReason: string;
}) {
  const response = await fetchJson<{ data: { bookingId: string } }>(
    `${API_BASE}/ecd/admin/registrations`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return response.data;
}

export async function bulkCreateEcdManualRegistrations(csv: string) {
  const response = await fetchJson<{ data: { createdCount: number; bookingIds: string[] } }>(
    `${API_BASE}/ecd/admin/registrations/bulk`,
    {
      method: 'POST',
      body: JSON.stringify({ csv }),
    },
  );
  return response.data;
}

export async function deleteEcdRegistrations(ids: string[]) {
  const response = await fetchJson<{ data: { deleted: number } }>(
    `${API_BASE}/ecd/admin/registrations`,
    {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    },
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

export async function venueCheckInEcdRegistration(bookingId: string) {
  const response = await fetchJson<{
    data: { alreadyCheckedIn: boolean; venueCheckedInAt: string | null };
  }>(`${API_BASE}/ecd/admin/registrations/${bookingId}/venue-check-in`, {
    method: 'POST',
  });
  return response.data;
}

export async function sessionCheckInEcdWorkshop(reservationId: string) {
  const response = await fetchJson<{
    data: {
      alreadyCheckedIn: boolean;
      sessionCheckedInAt: string | null;
      venueCheckedInAt?: string | null;
    };
  }>(`${API_BASE}/ecd/admin/workshop-reservations/${reservationId}/session-check-in`, {
    method: 'POST',
  });
  return response.data;
}

export async function verifyEcdRegistrationPayment(bookingId: string) {
  const response = await fetchJson<{
    data: {
      status: string;
      paymentStatus?: string;
      alreadyProcessed?: boolean;
      bookingId: string;
      orderCode: string;
      paidAt?: string | null;
      amountFormatted?: string;
      simulated?: boolean;
    };
  }>(`${API_BASE}/ecd/admin/registrations/${bookingId}/verify-payment`, {
    method: 'POST',
  });
  return response.data;
}

// ——— Content CMS ———

export type EcdPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: 'title' | 'strategic' | 'innovation' | 'empowerment' | 'community';
  blurb: string | null;
  supportedAsset: string | null;
  experienceUrl: string | null;
  featured: boolean;
  featuredSortOrder: number;
  showOnHome: boolean;
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
  tier?: 'title' | 'strategic' | 'innovation' | 'empowerment' | 'community';
  blurb?: string | null;
  supportedAsset?: string | null;
  experienceUrl?: string | null;
  featured?: boolean;
  featuredSortOrder?: number;
  showOnHome?: boolean;
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

export type EcdSession = {
  id: string;
  slug: string;
  trackIndex: number;
  timeLabel: string;
  format: string | null;
  category: string | null;
  title: string;
  speakerLabel: string | null;
  topics: string[];
  description: string | null;
  learn: string[];
  output: string | null;
  tools: string | null;
  level: string | null;
  fullJourneyOnly: boolean;
  capacity: number | null;
  sortOrder: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EcdSessionInput = {
  slug: string;
  trackIndex: number;
  timeLabel: string;
  format?: string | null;
  category?: string | null;
  title: string;
  speakerLabel?: string | null;
  topics?: string[];
  description?: string | null;
  learn?: string[];
  output?: string | null;
  tools?: string | null;
  level?: string | null;
  fullJourneyOnly?: boolean;
  capacity?: number | null;
  sortOrder?: number;
  published?: boolean;
};

export async function fetchEcdSessions() {
  const response = await fetchJson<{ data: { items: EcdSession[] } }>(
    `${API_BASE}/ecd/admin/sessions`,
    { method: 'GET' },
  );
  return response.data.items;
}

export async function createEcdSession(input: EcdSessionInput) {
  const response = await fetchJson<{ data: { session: EcdSession } }>(
    `${API_BASE}/ecd/admin/sessions`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.session;
}

export async function updateEcdSession(id: string, input: EcdSessionInput) {
  const response = await fetchJson<{ data: { session: EcdSession } }>(
    `${API_BASE}/ecd/admin/sessions/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data.session;
}

export async function deleteEcdSession(id: string) {
  await fetchJson(`${API_BASE}/ecd/admin/sessions/${id}`, { method: 'DELETE' });
}

// ——— Public booking portal (invite QR) ———

export type EcdPortalWorkshopOption = {
  slug: string;
  title: string;
  trackIndex: number;
  timeLabel: string;
  fullJourneyOnly: boolean;
  capacity: number | null;
  reservedCount: number;
  remaining: number | null;
  available: boolean;
  seatStatus: 'Available' | 'Few Seats' | 'Fully Booked';
};

export type EcdPortalBooking = {
  bookingId: string;
  orderCode: string;
  bookingPageUrl: string;
  paymentStatus: string;
  ticketType: 'ct' | 'fj';
  ticketName: string;
  qty: number;
  amountFormatted: string;
  buyerName: string;
  buyerEmail: string;
  maskedEmail: string;
  buyerMobile: string | null;
  paidAt: string | null;
  venueCheckedInAt: string | null;
  attendeeFrameUrl?: string | null;
  event: {
    title: string;
    startIso: string;
    endIso: string;
    location: string;
  };
  tickets: Array<{
    id: string;
    serial: string;
    status: string;
    attendeeName: string;
    attendeeEmail: string;
    qrPayload?: string;
  }>;
  workshops: EcdWorkshopReservation[];
  form: EcdRegistrationListItem['form'];
  viewer: 'anonymous' | 'buyer' | 'staff';
  buyerEmailLocked: string;
  canEdit: boolean;
  canCheckIn: boolean;
};

export async function fetchEcdPortalBooking(orderCode: string, editToken?: string | null) {
  const headers: Record<string, string> = {};
  if (editToken) headers.Authorization = `Bearer ${editToken}`;
  const response = await fetchJson<{ data: EcdPortalBooking }>(
    `${API_BASE}/ecd/portal/${encodeURIComponent(orderCode)}`,
    { method: 'GET', headers },
  );
  return response.data;
}

export async function requestEcdPortalOtp(orderCode: string) {
  const response = await fetchJson<{
    data: { sent: boolean; maskedEmail: string; ttlMinutes: number };
  }>(`${API_BASE}/ecd/portal/${encodeURIComponent(orderCode)}/otp/request`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return response.data;
}

export async function verifyEcdPortalOtp(orderCode: string, otp: string) {
  const response = await fetchJson<{
    data: { verified: boolean; editToken: string; expiresInSeconds: number };
  }>(`${API_BASE}/ecd/portal/${encodeURIComponent(orderCode)}/otp/verify`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
  return response.data;
}

export async function saveEcdPortalWorkshops(
  orderCode: string,
  sessionSlugs: string[],
  editToken?: string | null,
) {
  const headers: Record<string, string> = {};
  if (editToken) headers.Authorization = `Bearer ${editToken}`;
  const response = await fetchJson<{
    data: { workshops: EcdWorkshopReservation[]; cleared?: boolean };
  }>(`${API_BASE}/ecd/portal/${encodeURIComponent(orderCode)}/workshops`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionSlugs }),
  });
  return response.data;
}

export async function venueCheckInEcdPortal(orderCode: string) {
  const response = await fetchJson<{
    data: { alreadyCheckedIn: boolean; venueCheckedInAt: string | null };
  }>(`${API_BASE}/ecd/portal/${encodeURIComponent(orderCode)}/venue-check-in`, {
    method: 'POST',
  });
  return response.data;
}

/** Upload composited attending-frame image (data URL) for a booking. */
export async function uploadEcdAttendeeFrame(
  orderCode: string,
  imageBase64: string,
  opts?: { access?: string | null; editToken?: string | null },
) {
  const qs = new URLSearchParams();
  if (opts?.access) qs.set('access', opts.access);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts?.editToken) headers.Authorization = `Bearer ${opts.editToken}`;
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await fetchJson<{
    data: { attendeeFrameUrl: string; orderCode: string };
  }>(`${API_BASE}/ecd/booking/${encodeURIComponent(orderCode)}/attendee-frame${suffix}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageBase64 }),
  });
  return response.data;
}

export async function fetchEcdPublicWorkshops() {
  const response = await fetchJson<{
    data: { workshops: EcdPortalWorkshopOption[]; bookingAppBaseUrl?: string };
  }>(`${API_BASE}/ecd/content`, { method: 'GET' });
  return response.data.workshops ?? [];
}

// ——— Sponsor partnership inquiries ———

export type EcdSponsorInquiryStatus =
  | 'new'
  | 'reviewed'
  | 'in_progress'
  | 'accepted'
  | 'rejected';

export type EcdSponsorInquiry = {
  id: string;
  requestCode: string;
  status: EcdSponsorInquiryStatus;
  company: string;
  website: string | null;
  sector: string;
  country: string;
  companySize: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string | null;
  preferredContact: string;
  objectives: string[];
  interestedLevel: string;
  interestedProperties: string[];
  targetAudience: string | null;
  timing: string | null;
  notes: string | null;
  budgetBand: string | null;
  consent: boolean;
  adminNotes: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchEcdSponsorInquiries(params: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  const response = await fetchJson<{
    data: {
      items: EcdSponsorInquiry[];
      pagination: { page: number; pageSize: number; total: number };
    };
  }>(`${API_BASE}/ecd/admin/sponsor-inquiries${qs ? `?${qs}` : ''}`, { method: 'GET' });
  return response.data;
}

export async function updateEcdSponsorInquiry(
  id: string,
  input: { status: EcdSponsorInquiryStatus; adminNotes?: string | null },
) {
  const response = await fetchJson<{ data: { inquiry: EcdSponsorInquiry } }>(
    `${API_BASE}/ecd/admin/sponsor-inquiries/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return response.data.inquiry;
}

export type EcdPromoAppliesTo = 'all' | 'ct' | 'fj';

export type EcdPromoCode = {
  id: string;
  code: string;
  discountPercent: number;
  appliesTo: EcdPromoAppliesTo;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EcdPromoCodeInput = {
  code: string;
  discountPercent: number;
  appliesTo: EcdPromoAppliesTo;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
};

export async function fetchEcdPromoCodes() {
  const response = await fetchJson<{ data: { items: EcdPromoCode[] } }>(
    `${API_BASE}/ecd/admin/promo-codes`,
    { method: 'GET' },
  );
  return response.data;
}

export async function createEcdPromoCode(input: EcdPromoCodeInput) {
  const response = await fetchJson<{ data: { item: EcdPromoCode } }>(
    `${API_BASE}/ecd/admin/promo-codes`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.data.item;
}

export async function updateEcdPromoCode(id: string, input: EcdPromoCodeInput) {
  const response = await fetchJson<{ data: { item: EcdPromoCode } }>(
    `${API_BASE}/ecd/admin/promo-codes/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
  return response.data.item;
}

export async function deleteEcdPromoCode(id: string) {
  await fetchJson<{ data: { ok: boolean } }>(`${API_BASE}/ecd/admin/promo-codes/${id}`, {
    method: 'DELETE',
  });
}
