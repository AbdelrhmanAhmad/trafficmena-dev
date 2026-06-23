import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// --- Enums -----------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'manager', 'expert', 'user']);
export const userTypeEnum = pgEnum('user_type', ['learner', 'expert']);
export const eventTypeEnum = pgEnum('event_type', ['Event', 'Meetup', 'Mastermind', 'Retreat']);
export const assetFileTypeEnum = pgEnum('asset_file_type', ['Document', 'Video', 'Presentation']);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'sent',
  'accepted',
  'expired',
  'failed',
]);
export const invitationSourceEnum = pgEnum('invitation_source', ['single', 'csv']);
export const registrationStatusEnum = pgEnum('registration_status', [
  'active',
  'cancelled',
  'refund_requested',
]);
export const trackBookingSourceEnum = pgEnum('track_booking_source', ['paid', 'free', 'manual']);

// --- Core Tables ------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').default('TrafficMENA Member').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phoneNumber: text('phone_number'),
  role: userRoleEnum('role').default('user').notNull(),
  userType: userTypeEnum('user_type').default('learner').notNull(),
  experienceLevel: text('experience_level'),
  primaryGoal: text('primary_goal'),
  primaryChallenge: text('primary_challenge'),
  subscriptionStatus: text('subscription_status'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    eventDescription: text('event_description'),
    date: timestamp('date', { withTimezone: true }).notNull(),
    location: text('location'),
    locationUrl: text('location_url'),
    maxAttendees: integer('max_attendees'),
    meetingLink: text('meeting_link'),
    imageUrl: text('image_url'),
    tags: text('tags').array(),
    eventType: eventTypeEnum('event_type').default('Event').notNull(),
    guestExperts: jsonb('guest_experts'),
    priceInCents: integer('price_in_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index('events_date_idx').on(table.date),
  }),
);

export const eventAttendees = pgTable(
  'event_attendees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    pricePaidCents: integer('price_paid_cents'),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    sourceTrackBookingId: uuid('source_track_booking_id').references(() => trackBookings.id, {
      onDelete: 'set null',
    }),
    status: registrationStatusEnum('status').default('active').notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundRequestedAt: timestamp('refund_requested_at', { withTimezone: true }),
    adminNote: text('admin_note'),
  },
  (table) => ({
    eventIdx: index('event_attendees_event_idx').on(table.eventId),
    userIdx: index('event_attendees_user_idx').on(table.userId),
    uniqueEventUser: uniqueIndex('event_attendees_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    statusIdx: index('event_attendees_status_idx').on(table.status),
    eventStatusIdx: index('event_attendees_event_status_idx').on(table.eventId, table.status),
    sourceTrackBookingIdx: index('event_attendees_source_track_booking_idx').on(
      table.sourceTrackBookingId,
    ),
  }),
);

export const eventReservations = pgTable(
  'event_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    paymentId: uuid('payment_id')
      .references(() => payments.id, { onDelete: 'cascade' })
      .notNull(),
    reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    eventIdx: index('event_reservations_event_idx').on(table.eventId),
    eventUserUnique: uniqueIndex('event_reservations_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
    paymentIdx: index('event_reservations_payment_idx').on(table.paymentId),
    expiresIdx: index('event_reservations_expires_idx').on(table.expiresAt),
  }),
);

export const libraryAssets = pgTable(
  'library_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    fileType: assetFileTypeEnum('file_type').notNull(),
    fileUrl: text('file_url'),
    videoUrl: text('video_url'),
    documentUrl: text('document_url'),
    embedUrl: text('embed_url'),
    embedType: text('embed_type'),
    thumbnailUrl: text('thumbnail_url'),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    isPublic: boolean('is_public').default(false).notNull(),
    isPremium: boolean('is_premium').default(false).notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    durationSeconds: integer('duration_seconds'),
    fileSizeBytes: integer('file_size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index('library_assets_event_idx').on(table.eventId),
    isPublicIdx: index('library_assets_is_public_idx').on(table.isPublic),
  }),
);

export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    trackBookingStart: timestamp('track_booking_start', { withTimezone: true }),
    trackBookingEnd: timestamp('track_booking_end', { withTimezone: true }),
    singleBookingStart: timestamp('single_booking_start', { withTimezone: true }),
    singleBookingEnd: timestamp('single_booking_end', { withTimezone: true }),
    allowIndividualBooking: boolean('allow_individual_booking').default(false).notNull(),
    maxTrackBookings: integer('max_track_bookings'),
    priceInCents: integer('price_in_cents'),
    location: text('location'),
    locationUrl: text('location_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sortOrderIdx: index('tracks_sort_order_idx').on(table.sortOrder),
    publishedIdx: index('tracks_is_published_idx').on(table.isPublished),
  }),
);

export const trackEvents = pgTable(
  'track_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .references(() => tracks.id, { onDelete: 'cascade' })
      .notNull(),
    eventId: uuid('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    singlePriceInCents: integer('single_price_in_cents'),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    trackIdx: index('track_events_track_idx').on(table.trackId),
    eventIdx: index('track_events_event_idx').on(table.eventId),
    uniqueTrackEvent: uniqueIndex('track_events_unique').on(table.trackId, table.eventId),
    uniqueEventId: uniqueIndex('track_events_event_unique').on(table.eventId),
  }),
);

export const trackBookings = pgTable(
  'track_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .references(() => tracks.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    bookedAt: timestamp('booked_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    pricePaidCents: integer('price_paid_cents'),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    bookingSource: trackBookingSourceEnum('booking_source').notNull(),
    manualReference: text('manual_reference'),
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantReason: text('grant_reason'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokeReason: text('revoke_reason'),
  },
  (table) => ({
    trackIdx: index('track_bookings_track_idx').on(table.trackId),
    userIdx: index('track_bookings_user_idx').on(table.userId),
    uniqueTrackUser: uniqueIndex('track_bookings_track_user_unique').on(
      table.trackId,
      table.userId,
    ),
    paymentIdx: index('track_bookings_payment_id_idx').on(table.paymentId),
    activeTrackIdx: index('track_bookings_active_track_idx').on(table.trackId, table.revokedAt),
    activeUserIdx: index('track_bookings_active_user_idx').on(table.userId, table.revokedAt),
  }),
);

export const trackReservations = pgTable(
  'track_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .references(() => tracks.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    paymentId: uuid('payment_id')
      .references(() => payments.id, { onDelete: 'cascade' })
      .notNull(),
    reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    trackIdx: index('track_reservations_track_idx').on(table.trackId),
    trackUserUnique: uniqueIndex('track_reservations_track_user_unique').on(
      table.trackId,
      table.userId,
    ),
    paymentUnique: uniqueIndex('track_reservations_payment_unique').on(table.paymentId),
    expiresIdx: index('track_reservations_expires_idx').on(table.expiresAt),
  }),
);

// Content Series - Collections of library assets for content organization (separate from Event Tracks)
export const series = pgTable(
  'series',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').default(0).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    isPremium: boolean('is_premium').default(false).notNull(),
    priceInCents: integer('price_in_cents'),
    salesEnabled: boolean('sales_enabled').default(false).notNull(),
    trackId: uuid('track_id').references(() => tracks.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sortOrderIdx: index('series_sort_order_idx').on(table.sortOrder),
    publishedIdx: index('series_is_published_idx').on(table.isPublished),
    trackIdIdx: index('series_track_id_idx').on(table.trackId),
  }),
);

export const seriesAssets = pgTable(
  'series_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id')
      .references(() => series.id, { onDelete: 'cascade' })
      .notNull(),
    assetId: uuid('asset_id')
      .references(() => libraryAssets.id, { onDelete: 'cascade' })
      .notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    seriesIdx: index('series_assets_series_idx').on(table.seriesId),
    assetIdx: index('series_assets_asset_idx').on(table.assetId),
    uniqueSeriesAsset: uniqueIndex('series_assets_unique').on(table.seriesId, table.assetId),
  }),
);

export const seriesAccessGrants = pgTable(
  'series_access_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id')
      .references(() => series.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantReason: text('grant_reason').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokeReason: text('revoke_reason'),
  },
  (table) => ({
    activeBySeriesIdx: index('series_access_grants_active_by_series_idx').on(
      table.seriesId,
      table.revokedAt,
    ),
    activeByUserIdx: index('series_access_grants_active_by_user_idx').on(
      table.userId,
      table.revokedAt,
    ),
    activeSeriesUserUnique: uniqueIndex('series_access_grants_active_unique')
      .on(table.seriesId, table.userId)
      .where(sql`revoked_at is null`),
    paymentIdx: index('series_access_grants_payment_idx').on(table.paymentId),
  }),
);

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  category: text('category'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSkills = pgTable(
  'user_skills',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    skillId: uuid('skill_id')
      .references(() => skills.id, { onDelete: 'cascade' })
      .notNull(),
    proficiencyLevel: text('proficiency_level'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex('user_skills_user_skill_pk').on(table.userId, table.skillId),
  }),
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    token: text('token').notNull().unique(),
    status: invitationStatusEnum('status').default('pending').notNull(),
    source: invitationSourceEnum('source').default('single').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    customMessage: text('custom_message'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedUserId: uuid('accepted_user_id').references(() => users.id, { onDelete: 'set null' }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('invitations_email_idx').on(table.email),
    statusIdx: index('invitations_status_idx').on(table.status),
    acceptedUserIdx: index('invitations_accepted_user_idx').on(table.acceptedUserId),
    activatedAtIdx: index('invitations_activated_at_idx').on(table.activatedAt),
  }),
);

export const userActivities = pgTable(
  'user_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    activityType: text('activity_type').notNull(),
    activityData: jsonb('activity_data'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('user_activities_user_idx').on(table.userId),
    createdAtIdx: index('user_activities_created_at_idx').on(table.createdAt),
  }),
);

export const platformSettings = pgTable('platform_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  inviteOnlySignup: boolean('invite_only_signup').notNull().default(false),
  eventMode: boolean('event_mode').notNull().default(false),
  annualSubscriptionPriceCents: integer('annual_subscription_price_cents'),
  subscriberDiscountPercent: integer('subscriber_discount_percent').default(20),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export const assetViews = pgTable(
  'asset_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .references(() => libraryAssets.id, { onDelete: 'cascade' })
      .notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
    sessionDurationSeconds: integer('session_duration_seconds'),
  },
  (table) => ({
    assetIdx: index('asset_views_asset_idx').on(table.assetId),
    userAssetIdx: index('asset_views_user_asset_idx').on(table.userId, table.assetId),
  }),
);

export const authOtps = pgTable('auth_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attemptCount: integer('attempt_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const authAccounts = pgTable('auth_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    identifierCreatedAtIdx: index('auth_verifications_identifier_created_at_idx').on(
      table.identifier,
      table.createdAt,
    ),
  }),
);

// --- Payment Tables -----------------------------------------------------------

export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    discountPercent: integer('discount_percent').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex('promo_codes_code_unique')
      .on(table.code)
      .where(sql`is_deleted = false`),
    targetIdx: index('promo_codes_target_idx').on(table.targetType, table.targetId),
  }),
);

export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'expired']);

export const paymentItemTypeEnum = pgEnum('payment_item_type', [
  'event',
  'track',
  'subscription',
  'order',
  'masterclass',
]);

export const masterclassEnrollmentSourceEnum = pgEnum('masterclass_enrollment_source', [
  'paid',
  'manual',
]);

export const lessonCompletionMethodEnum = pgEnum('lesson_completion_method', ['manual', 'video']);

export const certificateStatusEnum = pgEnum('certificate_status', ['issued', 'revoked']);

export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed', 'expired']);

export const orderItemFulfillmentStatusEnum = pgEnum('order_item_fulfillment_status', [
  'pending',
  'fulfilled',
]);

export const orderItemTypeEnum = pgEnum('order_item_type', ['series', 'digital_product']);

export const digitalProductFileTypeEnum = pgEnum('digital_product_file_type', [
  'excel',
  'markdown',
  'html',
  'text',
  'powerpoint',
]);

export const digitalProducts = pgTable(
  'digital_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    priceInCents: integer('price_in_cents'),
    salesEnabled: boolean('sales_enabled').default(false).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    publishedIdx: index('digital_products_published_idx').on(table.isPublished),
    salesIdx: index('digital_products_sales_idx').on(table.salesEnabled),
  }),
);

export const digitalProductFiles = pgTable(
  'digital_product_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => digitalProducts.id, { onDelete: 'cascade' })
      .notNull(),
    fileType: digitalProductFileTypeEnum('file_type').notNull(),
    displayName: text('display_name').notNull(),
    fileUrl: text('file_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('digital_product_files_product_idx').on(table.productId),
  }),
);

export const digitalProductVideos = pgTable(
  'digital_product_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => digitalProducts.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    videoUrl: text('video_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('digital_product_videos_product_idx').on(table.productId),
  }),
);

export const digitalProductPurchases = pgTable(
  'digital_product_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    productId: uuid('product_id')
      .references(() => digitalProducts.id, { onDelete: 'cascade' })
      .notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userProductUnique: uniqueIndex('digital_product_purchases_user_product_unique').on(
      table.userId,
      table.productId,
    ),
    userIdx: index('digital_product_purchases_user_idx').on(table.userId),
  }),
);

export const masterclasses = pgTable(
  'masterclasses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    priceInCents: integer('price_in_cents'),
    isPublished: boolean('is_published').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    publishedIdx: index('masterclasses_published_idx').on(table.isPublished),
  }),
);

export const masterclassModules = pgTable(
  'masterclass_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterclassId: uuid('masterclass_id')
      .references(() => masterclasses.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    masterclassIdx: index('masterclass_modules_class_idx').on(table.masterclassId),
  }),
);

export const masterclassLessons = pgTable(
  'masterclass_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .references(() => masterclassModules.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    moduleIdx: index('masterclass_lessons_module_idx').on(table.moduleId),
  }),
);

export const masterclassLessonVideos = pgTable(
  'masterclass_lesson_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .references(() => masterclassLessons.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    videoUrl: text('video_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lessonIdx: index('masterclass_lesson_videos_lesson_idx').on(table.lessonId),
  }),
);

export const masterclassLessonFiles = pgTable(
  'masterclass_lesson_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .references(() => masterclassLessons.id, { onDelete: 'cascade' })
      .notNull(),
    fileType: digitalProductFileTypeEnum('file_type').notNull(),
    displayName: text('display_name').notNull(),
    fileUrl: text('file_url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lessonIdx: index('masterclass_lesson_files_lesson_idx').on(table.lessonId),
  }),
);

export const masterclassEnrollments = pgTable(
  'masterclass_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    masterclassId: uuid('masterclass_id')
      .references(() => masterclasses.id, { onDelete: 'cascade' })
      .notNull(),
    source: masterclassEnrollmentSourceEnum('source').default('paid').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    enrolledBy: uuid('enrolled_by').references(() => users.id, { onDelete: 'set null' }),
    enrollmentNote: text('enrollment_note'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userMasterclassUnique: uniqueIndex('masterclass_enrollments_user_class_unique').on(
      table.userId,
      table.masterclassId,
    ),
    userIdx: index('masterclass_enrollments_user_idx').on(table.userId),
  }),
);

export const masterclassLessonProgress = pgTable(
  'masterclass_lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    lessonId: uuid('lesson_id')
      .references(() => masterclassLessons.id, { onDelete: 'cascade' })
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
    completionMethod: lessonCompletionMethodEnum('completion_method').default('manual').notNull(),
  },
  (table) => ({
    userLessonUnique: uniqueIndex('masterclass_lesson_progress_user_lesson_unique').on(
      table.userId,
      table.lessonId,
    ),
    userIdx: index('masterclass_lesson_progress_user_idx').on(table.userId),
  }),
);

export type CertificateFieldSettings = {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
};

export type CertificateDesignSettings = {
  studentName: CertificateFieldSettings;
  courseTitle: CertificateFieldSettings;
  issueDate: CertificateFieldSettings;
  certificateCode: CertificateFieldSettings;
};

export const certificateSettings = pgTable('certificate_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  backgroundImageUrl: text('background_image_url'),
  settings: jsonb('settings').$type<CertificateDesignSettings>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const masterclassCertificateSettings = pgTable(
  'masterclass_certificate_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterclassId: uuid('masterclass_id')
      .references(() => masterclasses.id, { onDelete: 'cascade' })
      .notNull(),
    certificateEnabled: boolean('certificate_enabled').default(false).notNull(),
    certificateTitle: text('certificate_title'),
    certificateDescription: text('certificate_description'),
    certificateTemplateUrl: text('certificate_template_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    masterclassUnique: uniqueIndex('masterclass_certificate_settings_class_unique').on(
      table.masterclassId,
    ),
  }),
);

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    masterclassId: uuid('masterclass_id')
      .references(() => masterclasses.id, { onDelete: 'cascade' })
      .notNull(),
    certificateCode: text('certificate_code').notNull(),
    issueDate: timestamp('issue_date', { withTimezone: true }).defaultNow().notNull(),
    status: certificateStatusEnum('status').default('issued').notNull(),
    generatedCertificateUrl: text('generated_certificate_url'),
    externalCertificateUrl: text('external_certificate_url'),
    certificateTemplateUrl: text('certificate_template_url'),
    issuedByAdminId: uuid('issued_by_admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    issuedManually: boolean('issued_manually').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userMasterclassUnique: uniqueIndex('certificates_user_masterclass_unique').on(
      table.userId,
      table.masterclassId,
    ),
    codeUnique: uniqueIndex('certificates_code_unique').on(table.certificateCode),
    userIdx: index('certificates_user_idx').on(table.userId),
    masterclassIdx: index('certificates_masterclass_idx').on(table.masterclassId),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').default('EGP').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('orders_user_idx').on(table.userId),
    statusIdx: index('orders_status_idx').on(table.status),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    itemType: orderItemTypeEnum('item_type').default('series').notNull(),
    seriesId: uuid('series_id').references(() => series.id, { onDelete: 'restrict' }),
    digitalProductId: uuid('digital_product_id').references(() => digitalProducts.id, {
      onDelete: 'restrict',
    }),
    unitPriceCents: integer('unit_price_cents').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
    fulfillmentStatus: orderItemFulfillmentStatusEnum('fulfillment_status')
      .default('pending')
      .notNull(),
  },
  (table) => ({
    orderIdx: index('order_items_order_idx').on(table.orderId),
    seriesIdx: index('order_items_series_idx').on(table.seriesId),
    digitalProductIdx: index('order_items_digital_product_idx').on(table.digitalProductId),
    orderSeriesUnique: uniqueIndex('order_items_order_series_unique')
      .on(table.orderId, table.seriesId)
      .where(sql`series_id IS NOT NULL`),
    orderDigitalProductUnique: uniqueIndex('order_items_order_digital_product_unique')
      .on(table.orderId, table.digitalProductId)
      .where(sql`digital_product_id IS NOT NULL`),
  }),
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').default('EGP').notNull(),
    itemType: paymentItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id'),
    promoCodeId: uuid('promo_code_id').references(() => promoCodes.id, { onDelete: 'set null' }),
    discountAppliedCents: integer('discount_applied_cents'),
    originalAmountCents: integer('original_amount_cents'),
    fawaterkInvoiceId: text('fawaterk_invoice_id'),
    fawaterkInvoiceKey: text('fawaterk_invoice_key'),
    fawryCode: text('fawry_code'),
    amanCode: text('aman_code'),
    masaryCode: text('masary_code'),
    meezaReference: text('meeza_reference'),
    meezaQrCode: text('meeza_qr_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('payments_user_idx').on(table.userId),
    statusIdx: index('payments_status_idx').on(table.status),
    invoiceIdx: index('payments_fawaterk_invoice_idx').on(table.fawaterkInvoiceId),
    promoCodeIdx: index('payments_promo_code_idx').on(table.promoCodeId),
    uniquePendingPayment: uniqueIndex('payments_unique_pending')
      .on(table.userId, table.itemType, table.itemId)
      .where(sql`status = 'pending'`),
    uniquePendingSubscription: uniqueIndex('payments_unique_pending_subscription')
      .on(table.userId)
      .where(sql`status = 'pending' AND item_type = 'subscription'`),
  }),
);

export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired']);
export const subscriptionSourceEnum = pgEnum('subscription_source', ['paid', 'legacy', 'gift']);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: subscriptionStatusEnum('subscription_status').default('active').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    source: subscriptionSourceEnum('source').default('paid').notNull(),
    pricePaidCents: integer('price_paid_cents').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
    grantReason: text('grant_reason'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokeReason: text('revoke_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('subscriptions_user_idx').on(table.userId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    endsAtIdx: index('subscriptions_ends_at_idx').on(table.endsAt),
    // Composite index for common subscription lookup pattern
    activeLookupIdx: index('subscriptions_active_lookup_idx').on(
      table.userId,
      table.status,
      table.endsAt,
    ),
    oneActivePerUser: uniqueIndex('subscriptions_one_active_per_user')
      .on(table.userId)
      .where(sql`subscription_status = 'active' and revoked_at is null`),
  }),
);
