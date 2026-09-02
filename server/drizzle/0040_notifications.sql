-- W11A notification foundation: templates, campaigns, deliveries (email + WhatsApp outbox)

DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('email', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_delivery_status" AS ENUM ('pending', 'processing', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_campaign_status" AS ENUM ('draft', 'scheduled', 'processing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_campaign_kind" AS ENUM ('announcement', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_audience_type" AS ENUM (
    'all_users',
    'event_attendees',
    'track_buyers',
    'masterclass_enrollees',
    'activity_channel_members',
    'role_based',
    'explicit_users'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "category" text NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "subject_en" text DEFAULT '' NOT NULL,
  "subject_ar" text DEFAULT '' NOT NULL,
  "body_html_en" text DEFAULT '' NOT NULL,
  "body_html_ar" text DEFAULT '' NOT NULL,
  "body_text_en" text DEFAULT '' NOT NULL,
  "body_text_ar" text DEFAULT '' NOT NULL,
  "whatsapp_provider_template_id" text,
  "allowed_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_key_channel_idx"
  ON "notification_templates" ("key", "channel");

CREATE TABLE IF NOT EXISTS "notification_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" "notification_campaign_kind" DEFAULT 'announcement' NOT NULL,
  "event_type" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "activity_announcement_id" uuid REFERENCES "activity_announcements"("id") ON DELETE SET NULL,
  "template_id" uuid REFERENCES "notification_templates"("id") ON DELETE SET NULL,
  "audience_type" "notification_audience_type",
  "audience_ref" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "notification_campaign_status" DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "title_en" text DEFAULT '' NOT NULL,
  "title_ar" text DEFAULT '' NOT NULL,
  "body_html_en" text DEFAULT '' NOT NULL,
  "body_html_ar" text DEFAULT '' NOT NULL,
  "body_text_en" text DEFAULT '' NOT NULL,
  "body_text_ar" text DEFAULT '' NOT NULL,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notification_campaigns_status_idx"
  ON "notification_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "notification_campaigns_scheduled_at_idx"
  ON "notification_campaigns" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "notification_campaigns_event_type_idx"
  ON "notification_campaigns" ("event_type");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid REFERENCES "notification_campaigns"("id") ON DELETE SET NULL,
  "event_type" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "recipient_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" "notification_channel" NOT NULL,
  "status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
  "skip_reason" text,
  "idempotency_key" text NOT NULL,
  "destination_masked" text,
  "provider" text,
  "provider_message_id" text,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error_code" text,
  "last_error_message" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "locale" text DEFAULT 'en' NOT NULL,
  "claimed_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "skipped_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_idempotency_key_idx"
  ON "notification_deliveries" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx"
  ON "notification_deliveries" ("status");
CREATE INDEX IF NOT EXISTS "notification_deliveries_campaign_idx"
  ON "notification_deliveries" ("campaign_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_recipient_idx"
  ON "notification_deliveries" ("recipient_user_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_event_idx"
  ON "notification_deliveries" ("event_type", "entity_id");

-- Seed system email templates (WhatsApp templates deferred to W11B provider)
INSERT INTO "notification_templates" (
  "key", "category", "channel", "is_active",
  "subject_en", "subject_ar",
  "body_html_en", "body_html_ar",
  "body_text_en", "body_text_ar",
  "allowed_variables"
) VALUES
(
  'certificate_issued', 'learning', 'email', true,
  'Your certificate is ready', 'شهادتك جاهزة',
  '<p>Hi {{userName}},</p><p>Your certificate for {{courseTitle}} is ready.</p><p><a href="{{certificateUrl}}">Download certificate</a></p>',
  '<p>مرحبًا {{userName}}،</p><p>شهادتك لدورة {{courseTitle}} جاهزة.</p><p><a href="{{certificateUrl}}">تحميل الشهادة</a></p>',
  'Hi {{userName}}, your certificate for {{courseTitle}} is ready: {{certificateUrl}}',
  'مرحبًا {{userName}}، شهادتك لدورة {{courseTitle}} جاهزة: {{certificateUrl}}',
  '["userName","courseTitle","certificateUrl"]'::jsonb
),
(
  'payment_success', 'payment', 'email', true,
  'Payment confirmed', 'تم تأكيد الدفع',
  '<p>Hi {{userName}},</p><p>Your payment of {{amount}} {{currency}} was successful.</p>',
  '<p>مرحبًا {{userName}}،</p><p>تم دفع {{amount}} {{currency}} بنجاح.</p>',
  'Hi {{userName}}, payment of {{amount}} {{currency}} succeeded.',
  'مرحبًا {{userName}}، تم دفع {{amount}} {{currency}} بنجاح.',
  '["userName","amount","currency","itemType"]'::jsonb
),
(
  'payment_failed', 'payment', 'email', true,
  'Payment failed', 'فشل الدفع',
  '<p>Hi {{userName}},</p><p>Your payment could not be completed. Please try again.</p>',
  '<p>مرحبًا {{userName}}،</p><p>تعذر إتمام الدفع. يرجى المحاولة مرة أخرى.</p>',
  'Hi {{userName}}, your payment failed. Please try again.',
  'مرحبًا {{userName}}، فشل الدفع. يرجى المحاولة مرة أخرى.',
  '["userName","itemType"]'::jsonb
),
(
  'payment_pending', 'payment', 'email', true,
  'Payment pending', 'الدفع قيد الانتظار',
  '<p>Hi {{userName}},</p><p>Your payment is pending. Complete it using your selected method.</p>',
  '<p>مرحبًا {{userName}}،</p><p>دفعتك قيد الانتظار. أكملها عبر وسيلة الدفع المختارة.</p>',
  'Hi {{userName}}, your payment is pending.',
  'مرحبًا {{userName}}، دفعتك قيد الانتظار.',
  '["userName","itemType"]'::jsonb
),
(
  'access_granted', 'access', 'email', true,
  'Access granted', 'تم منحك الوصول',
  '<p>Hi {{userName}},</p><p>You now have access to {{itemTitle}}.</p><p><a href="{{itemUrl}}">Open</a></p>',
  '<p>مرحبًا {{userName}}،</p><p>تم منحك الوصول إلى {{itemTitle}}.</p><p><a href="{{itemUrl}}">فتح</a></p>',
  'Hi {{userName}}, you now have access to {{itemTitle}}: {{itemUrl}}',
  'مرحبًا {{userName}}، تم منحك الوصول إلى {{itemTitle}}: {{itemUrl}}',
  '["userName","itemTitle","itemUrl"]'::jsonb
),
(
  'event_registration', 'events', 'email', true,
  'You are registered', 'تم تسجيلك',
  '<p>Hi {{userName}},</p><p>You are registered for {{eventTitle}}.</p><p><a href="{{eventUrl}}">Event page</a> · <a href="{{calendarUrl}}">Add to calendar</a></p>',
  '<p>مرحبًا {{userName}}،</p><p>تم تسجيلك في {{eventTitle}}.</p><p><a href="{{eventUrl}}">صفحة الفعالية</a> · <a href="{{calendarUrl}}">أضف للتقويم</a></p>',
  'Hi {{userName}}, registered for {{eventTitle}}. Event: {{eventUrl}} Calendar: {{calendarUrl}}',
  'مرحبًا {{userName}}، تم تسجيلك في {{eventTitle}}. الفعالية: {{eventUrl}} التقويم: {{calendarUrl}}',
  '["userName","eventTitle","eventUrl","calendarUrl","googleCalendarUrl","icsDownloadUrl"]'::jsonb
),
(
  'track_registration', 'access', 'email', true,
  'Track booking confirmed', 'تم تأكيد حجز المسار',
  '<p>Hi {{userName}},</p><p>Your booking for {{trackTitle}} is confirmed.</p><p><a href="{{trackUrl}}">Open track</a></p>',
  '<p>مرحبًا {{userName}}،</p><p>تم تأكيد حجزك لمسار {{trackTitle}}.</p><p><a href="{{trackUrl}}">فتح المسار</a></p>',
  'Hi {{userName}}, track {{trackTitle}} booking confirmed: {{trackUrl}}',
  'مرحبًا {{userName}}، تم تأكيد حجز {{trackTitle}}: {{trackUrl}}',
  '["userName","trackTitle","trackUrl","calendarUrl"]'::jsonb
),
(
  'event_rescheduled', 'events', 'email', true,
  'Event rescheduled', 'تم تغيير موعد الفعالية',
  '<p>Hi {{userName}},</p><p>{{eventTitle}} has a new schedule.</p><p><a href="{{eventUrl}}">View updated details</a></p>',
  '<p>مرحبًا {{userName}}،</p><p>تم تغيير موعد {{eventTitle}}.</p><p><a href="{{eventUrl}}">عرض التفاصيل المحدثة</a></p>',
  'Hi {{userName}}, {{eventTitle}} was rescheduled: {{eventUrl}}',
  'مرحبًا {{userName}}، تم تغيير موعد {{eventTitle}}: {{eventUrl}}',
  '["userName","eventTitle","eventUrl"]'::jsonb
),
(
  'event_cancelled', 'events', 'email', true,
  'Event cancelled', 'تم إلغاء الفعالية',
  '<p>Hi {{userName}},</p><p>{{eventTitle}} has been cancelled.</p>',
  '<p>مرحبًا {{userName}}،</p><p>تم إلغاء {{eventTitle}}.</p>',
  'Hi {{userName}}, {{eventTitle}} was cancelled.',
  'مرحبًا {{userName}}، تم إلغاء {{eventTitle}}.',
  '["userName","eventTitle","eventUrl"]'::jsonb
),
(
  'refund_status_update', 'events', 'email', true,
  'Refund update', 'تحديث الاسترجاع',
  '<p>Hi {{userName}},</p><p>Your refund request for {{eventTitle}} is now {{refundStatus}}.</p>',
  '<p>مرحبًا {{userName}}،</p><p>طلب استرجاعك لـ {{eventTitle}} أصبح {{refundStatus}}.</p>',
  'Hi {{userName}}, refund for {{eventTitle}} is {{refundStatus}}.',
  'مرحبًا {{userName}}، حالة الاسترجاع لـ {{eventTitle}}: {{refundStatus}}.',
  '["userName","eventTitle","refundStatus"]'::jsonb
)
ON CONFLICT ("key", "channel") DO NOTHING;
