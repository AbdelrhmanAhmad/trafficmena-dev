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
    maxAttendees: integer('max_attendees'),
    meetingLink: text('meeting_link'),
    imageUrl: text('image_url'),
    tags: text('tags').array(),
    eventType: eventTypeEnum('event_type').default('Event').notNull(),
    guestExperts: jsonb('guest_experts'),
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
  },
  (table) => ({
    eventIdx: index('event_attendees_event_idx').on(table.eventId),
    userIdx: index('event_attendees_user_idx').on(table.userId),
    uniqueEventUser: uniqueIndex('event_attendees_event_user_unique').on(
      table.eventId,
      table.userId,
    ),
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
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    viewCount: integer('view_count').default(0).notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    durationSeconds: integer('duration_seconds'),
    fileSizeBytes: integer('file_size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index('library_assets_event_idx').on(table.eventId),
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

export const authVerifications = pgTable('auth_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
