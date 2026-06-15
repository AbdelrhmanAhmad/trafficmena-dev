# Track Enrollment 0015 Migration Runbook

This runbook covers `server/drizzle/0015_steady_sabra.sql`.

## 1. Why This Migration Matters

Migration `0015` adds the schema required for:

1. Manual track enrollments.
2. Track enrollment revocation.
3. Event-attendee provenance from track bookings.
4. Active-vs-historical track booking checks.

It introduces these columns:

- `track_bookings.booking_source`
- `track_bookings.manual_reference`
- `track_bookings.granted_by`
- `track_bookings.grant_reason`
- `track_bookings.revoked_at`
- `track_bookings.revoked_by`
- `track_bookings.revoke_reason`
- `event_attendees.source_track_booking_id`

It also backfills `track_bookings.booking_source` for existing rows.
It backfills `event_attendees.source_track_booking_id` for legacy track-derived attendee rows using safe historical signals.

## 2. Critical Deploy-Order Rule

The new server code reads `track_bookings.revoked_at` immediately in track, event, library, series, and payment flows.

If the app code is deployed before migration `0015` is applied, requests can fail with errors like:

```text
column track_bookings.revoked_at does not exist
```

Safest order:

1. Apply the DB migration first.
2. Then deploy or restart the server build that uses the new schema.

If the new build is already running and routes are failing, applying the migration should restore those routes.

## 3. Pre-Deployment Gates

Do not run this migration until all gates pass.

1. A fresh database backup or snapshot is available.
2. The release artifact includes both the server code change and `server/drizzle/0015_steady_sabra.sql`.
3. The target DB user has permission to run schema migrations.
4. A short smoke-test window is reserved after migration.

## 4. Local Apply Steps

1. Start the project Postgres instance:
   ```bash
   npm run db:start
   ```
2. Apply pending migrations:
   ```bash
   npm --prefix server run db:migrate
   ```
3. Restart the local API server if it is already running.
4. Re-test:
   - Track details page
   - Track edit page
   - Track attendees page

## 5. Production Apply Steps

1. Confirm backup/snapshot completed successfully.
2. Make sure the deployment contains `server/drizzle/0015_steady_sabra.sql`.
3. Run:
   ```bash
   npm --prefix server run db:migrate
   ```
4. Deploy or restart the API service using the build that contains the manual track enrollment feature.
5. Run the validation checks in Section 6.

## 6. Validation Checklist

Run these queries immediately after migration.

1. Confirm track booking columns exist:
   ```sql
   select column_name
   from information_schema.columns
   where table_name = 'track_bookings'
     and column_name in (
       'booking_source',
       'manual_reference',
       'granted_by',
       'grant_reason',
       'revoked_at',
       'revoked_by',
       'revoke_reason'
     )
   order by column_name;
   ```
   Expected: `7` rows.

2. Confirm attendee provenance column exists:
   ```sql
   select column_name
   from information_schema.columns
   where table_name = 'event_attendees'
     and column_name = 'source_track_booking_id';
   ```
   Expected: `1` row.

3. Confirm booking source backfill completed:
   ```sql
   select count(*) as null_booking_source_rows
   from track_bookings
   where booking_source is null;
   ```
   Expected: `0`.

4. Confirm legacy attendee provenance backfill completed for safe historical matches:
   ```sql
   select count(*) as unresolved_safe_legacy_rows
   from event_attendees ea
   join track_bookings tb on tb.user_id = ea.user_id
   join track_events te on te.track_id = tb.track_id and te.event_id = ea.event_id
   where ea.source_track_booking_id is null
     and (
       (tb.payment_id is not null and ea.payment_id = tb.payment_id)
       or (
         tb.payment_id is null
         and ea.payment_id is null
         and tb.paid_at is null
         and ea.paid_at is null
         and coalesce(tb.price_paid_cents, 0) = coalesce(ea.price_paid_cents, 0)
         and ea.registered_at = tb.booked_at
       )
     );
   ```
   Expected: `0`.

## 7. Smoke Tests

After migration and app restart/deploy:

1. Open the admin tracks list.
2. Open a published track details page.
3. Open a draft track details page as owner/admin/manager.
4. Open track edit for a published track.
5. Open track edit for a draft track.
6. Open track attendees.
7. Create one manual enrollment in a safe non-production track.
8. Revoke that manual enrollment and confirm the user loses track-derived event access only.
9. Revoke one legacy pre-migration enrollment in staging and confirm linked event access is removed as expected.

## 8. Rollback Guidance

This migration is additive and backward-compatible with the previous app build.

That means:

1. If the migration succeeds but the app deploy is paused, the old app can continue running.
2. If the new app deploy has an issue unrelated to the migration, prefer rolling back the app only.
3. Do not drop the new columns unless you intentionally plan a schema rollback.

If a full rollback is required, use the database backup/snapshot taken before deployment.
