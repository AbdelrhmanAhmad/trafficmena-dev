import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Removable ECD (ECommerce Day 2026 HTML checkout) tables.
 * Foreign keys to `users` are declared in the SQL migration (avoids schema circular imports).
 */

export const ecdTicketTypeEnum = pgEnum('ecd_ticket_type', ['ct', 'fj']);

export const ecdPaymentStatusEnum = pgEnum('ecd_payment_status', [
  'draft',
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
]);

export const ecdTicketStatusEnum = pgEnum('ecd_ticket_status', ['held', 'active', 'cancelled']);

export const ecdHtmlForms = pgTable(
  'ecd_html_forms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    company: text('company'),
    jobTitle: text('job_title'),
    country: text('country'),
    needInvoice: integer('need_invoice').default(0).notNull(),
    invoiceCompany: text('invoice_company'),
    taxId: text('tax_id'),
    billingAddress: text('billing_address'),
    buyerMobile: text('buyer_mobile'),
    buyerCountryCode: text('buyer_country_code'),
    /** Ecommerce store URL or "none" (checkout-from-client). */
    store: text('store'),
    linkedinUrl: text('linkedin_url'),
    facebookUrl: text('facebook_url'),
    accessibilityNeeds: text('accessibility_needs'),
    newsOptIn: integer('news_opt_in').default(0).notNull(),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('ecd_html_forms_user_idx').on(table.userId),
  }),
);

export const ecdBookings = pgTable(
  'ecd_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    htmlFormId: uuid('html_form_id'),
    orderCode: text('order_code').notNull(),
    publicTokenHash: text('public_token_hash').notNull(),
    ticketType: ecdTicketTypeEnum('ticket_type').notNull(),
    qty: integer('qty').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    discountCents: integer('discount_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').default('EGP').notNull(),
    promoCode: text('promo_code'),
    paymentStatus: ecdPaymentStatusEnum('payment_status').default('draft').notNull(),
    paymentMethodId: integer('payment_method_id'),
    paymentMethodName: text('payment_method_name'),
    fawaterkIntentKey: text('fawaterk_intent_key'),
    fawaterkTransactionId: integer('fawaterk_transaction_id'),
    fawryCode: text('fawry_code'),
    amanCode: text('aman_code'),
    masaryCode: text('masary_code'),
    meezaReference: text('meeza_reference'),
    meezaQrCode: text('meeza_qr_code'),
    buyerName: text('buyer_name').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    buyerMobile: text('buyer_mobile'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderCodeIdx: uniqueIndex('ecd_bookings_order_code_idx').on(table.orderCode),
    userIdx: index('ecd_bookings_user_idx').on(table.userId),
    statusIdx: index('ecd_bookings_status_idx').on(table.paymentStatus),
    intentKeyIdx: uniqueIndex('ecd_bookings_intent_key_idx')
      .on(table.fawaterkIntentKey)
      .where(sql`fawaterk_intent_key is not null`),
    publicTokenIdx: index('ecd_bookings_public_token_idx').on(table.publicTokenHash),
  }),
);

export const ecdCheckoutTokens = pgTable(
  'ecd_checkout_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id').notNull(),
    bookingId: uuid('booking_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('ecd_checkout_tokens_hash_idx').on(table.tokenHash),
    bookingIdx: index('ecd_checkout_tokens_booking_idx').on(table.bookingId),
    userIdx: index('ecd_checkout_tokens_user_idx').on(table.userId),
  }),
);

export const ecdTickets = pgTable(
  'ecd_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull(),
    userId: uuid('user_id').notNull(),
    serial: text('serial').notNull(),
    status: ecdTicketStatusEnum('status').default('held').notNull(),
    attendeeName: text('attendee_name').notNull(),
    attendeeEmail: text('attendee_email').notNull(),
    attendeeMobile: text('attendee_mobile'),
    attendeeCompany: text('attendee_company'),
    attendeeTitle: text('attendee_title'),
    interests: jsonb('interests').$type<string[]>(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    serialIdx: uniqueIndex('ecd_tickets_serial_idx').on(table.serial),
    bookingIdx: index('ecd_tickets_booking_idx').on(table.bookingId),
    userIdx: index('ecd_tickets_user_idx').on(table.userId),
  }),
);

/**
 * Sponsors / partners for homepage marquee + sponsors.html
 * (featured band + five ecosystem tiers). Removable with ECD module.
 */
export const ecdPartners = pgTable(
  'ecd_partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    logoUrl: text('logo_url'),
    websiteUrl: text('website_url'),
    /** title | strategic | innovation | empowerment | community */
    tier: text('tier').default('community').notNull(),
    blurb: text('blurb'),
    supportedAsset: text('supported_asset'),
    experienceUrl: text('experience_url'),
    featured: integer('featured').default(0).notNull(),
    featuredSortOrder: integer('featured_sort_order').default(0).notNull(),
    /** Show in homepage partners marquee */
    showOnHome: integer('show_on_home').default(1).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    published: integer('published').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sortIdx: index('ecd_partners_sort_idx').on(table.sortOrder),
    publishedIdx: index('ecd_partners_published_idx').on(table.published),
    tierIdx: index('ecd_partners_tier_idx').on(table.tier),
    featuredIdx: index('ecd_partners_featured_idx').on(table.featured),
  }),
);

/** Speakers for home carousel + speakers.html (featured / room / type filters). */
export const ecdSpeakers = pgTable(
  'ecd_speakers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    role: text('role'),
    company: text('company'),
    photoUrl: text('photo_url'),
    /** 0 Main Stage · 1 Second Stage · 2 Acquisition · 3 CRO/Retention · 4 Ops/Logistics */
    roomIndex: integer('room_index').default(0).notNull(),
    speakerType: text('speaker_type'),
    statusTag: text('status_tag').default('Confirmed'),
    expertise: jsonb('expertise').$type<string[]>(),
    sessionTitle: text('session_title'),
    sessionLabel: text('session_label'),
    proof: text('proof'),
    featured: integer('featured').default(0).notNull(),
    featuredSortOrder: integer('featured_sort_order').default(0).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    published: integer('published').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sortIdx: index('ecd_speakers_sort_idx').on(table.sortOrder),
    publishedIdx: index('ecd_speakers_published_idx').on(table.published),
    featuredIdx: index('ecd_speakers_featured_idx').on(table.featured),
    roomIdx: index('ecd_speakers_room_idx').on(table.roomIndex),
  }),
);

/**
 * Exactly two rows (ct / fj). Admin edits only — no insert/delete of package keys.
 * Price + display copy for home, checkout, emails.
 */
export const ecdTicketPackages = pgTable('ecd_ticket_packages', {
  ticketType: ecdTicketTypeEnum('ticket_type').primaryKey(),
  displayName: text('display_name').notNull(),
  eyebrow: text('eyebrow').notNull(),
  title: text('title').notNull(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  badge: text('badge'),
  ctaLabel: text('cta_label').notNull(),
  priceCents: integer('price_cents').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ecdFeatureKindEnum = pgEnum('ecd_feature_kind', ['included', 'excluded']);

export const ecdTicketFeatures = pgTable(
  'ecd_ticket_features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketType: ecdTicketTypeEnum('ticket_type').notNull(),
    kind: ecdFeatureKindEnum('kind').notNull(),
    label: text('label').notNull(),
    emphasis: integer('emphasis').default(0).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    ticketIdx: index('ecd_ticket_features_ticket_idx').on(table.ticketType),
    sortIdx: index('ecd_ticket_features_sort_idx').on(table.ticketType, table.sortOrder),
  }),
);
