# Subscriptions 0013 Migration Audit Runbook

This runbook is required before deploying `server/drizzle/0013_blue_luckman.sql` to staging or production.

## 1. Why This Exists

Migration `0013` does three high-impact data operations:

1. Backfills `subscriptions.source` using payment signals.
2. Auto-expires duplicate active subscriptions.
3. Auto-expires active subscriptions that already ended.

This can affect entitlement behavior if the pre-migration data shape is not audited first.

## 2. Pre-Deployment Gates

Do not run migration until all gates pass.

1. Full DB backup is scheduled and verified recoverable.
2. App deploy and DB migration window are coordinated (no ad-hoc deploy).
3. SQL preflight checks below are run against the target DB.
4. Findings are reviewed by engineering + operations.

## 3. SQL Preflight Checklist

Run these queries before deployment and save outputs with timestamp.

1. Baseline row counts:
   ```sql
   select count(*) as total_subscriptions from subscriptions;
   ```

2. Estimate rows that will be inferred as paid vs non-paid:
   ```sql
   select
     case
       when payment_id is not null or coalesce(price_paid_cents, 0) > 0 then 'paid_inferred'
       else 'legacy_or_gift_inferred'
     end as inferred_source,
     count(*) as rows
   from subscriptions
   group by 1
   order by 1;
   ```

3. Users with duplicate active subscriptions (will be auto-expired to one):
   ```sql
   select user_id, count(*) as active_count
   from subscriptions
   where subscription_status = 'active'
     and revoked_at is null
   group by user_id
   having count(*) > 1
   order by active_count desc;
   ```

4. Active subscriptions that already ended (will be auto-expired):
   ```sql
   select count(*) as expired_but_active
   from subscriptions
   where subscription_status = 'active'
     and revoked_at is null
     and ends_at < now();
   ```

5. Legacy source heuristic verification (rows that will be tagged `source = 'legacy'`):
   ```sql
   SELECT id, user_id, payment_id, price_paid_cents
   FROM subscriptions
   WHERE payment_id IS NULL AND COALESCE(price_paid_cents, 0) <= 0;
   ```
   Review these rows: they should all be legitimate legacy/gift subscriptions, not data errors.

6. Inconsistent paid signals (manual review required):
   ```sql
   select
     sum(case when payment_id is not null and coalesce(price_paid_cents, 0) = 0 then 1 else 0 end) as payment_id_with_zero_price,
     sum(case when payment_id is null and coalesce(price_paid_cents, 0) > 0 then 1 else 0 end) as price_without_payment_id
   from subscriptions;
   ```

## 4. Decision Rule For Finding #14 (Source Backfill Risk)

Use this rule after preflight:

1. If `legacy_or_gift_inferred = 0`, risk from source backfill is low.
2. If `legacy_or_gift_inferred > 0`, confirm with product/ops whether non-paid subscriptions historically existed.
3. If historical non-paid records are uncertain, pause deployment until the team agrees on classification policy (legacy vs gift).

Note: migration can infer `paid` vs non-paid, but cannot perfectly reconstruct historical `legacy` vs `gift` without prior source metadata.

## 5. Deployment Steps

1. Ensure backup completed successfully.
2. Deploy server build containing schema + route changes.
3. Run migration:
   ```bash
   npm --prefix server run db:migrate
   ```
4. Confirm migration `0013_blue_luckman.sql` applied exactly once.

## 6. Post-Deployment Validation

Run all queries below immediately after migration:

1. `source` backfill integrity:
   ```sql
   select source, count(*) as rows
   from subscriptions
   group by source
   order by source;
   ```

2. Null-source guard:
   ```sql
   select count(*) as null_source_rows
   from subscriptions
   where source is null;
   ```
   Expected: `0`.

3. Unique active invariant holds:
   ```sql
   select count(*) as users_with_multiple_active
   from (
     select user_id
     from subscriptions
     where subscription_status = 'active'
       and revoked_at is null
     group by user_id
     having count(*) > 1
   ) dup;
   ```
   Expected: `0`.

4. Backup table integrity:
   ```sql
   select backup_reason, count(*) as rows
   from subscriptions_0013_backup
   group by backup_reason
   order by backup_reason;
   ```

5. Verify all rows in backup table are now expired:
   ```sql
   select count(*) as backup_rows_not_expired
   from subscriptions s
   join subscriptions_0013_backup b on b.id = s.id
   where s.subscription_status <> 'expired';
   ```
   Expected: `0`.

### 6.1 Pass/Fail Criteria

| Check | Pass | Fail Action |
|-------|------|-------------|
| Null source rows (query 2) | = 0 | ROLLBACK: Full DB restore |
| Duplicate active users (query 3) | = 0 | ROLLBACK: Full DB restore |
| Backup table has rows (query 4) | > 0 if preflight found duplicates | Investigate — may indicate migration skipped backup |
| Backup rows expired (query 5) | = 0 | Re-run expiration UPDATE manually against backup join |

If any check fails, **stop all deployment activity** and follow Section 7.

## 7. Rollback and Mitigation

### Option A: Full DB Restore (Preferred)

1. Stop application servers to prevent further writes.
2. Restore from the pre-migration backup (`pg_restore` or cloud snapshot).
3. Deploy the **previous** build (without migration 0013).
4. Verify `/api/health` returns 200.
5. Run Section 3 baseline counts to confirm data matches pre-migration state.
6. Resume traffic after confirmation.

### Option B: Targeted SQL Rollback (If Full Restore Unavailable)

Run in this order inside a transaction:

```sql
BEGIN;

-- 1. Drop the unique-active-per-user index
DROP INDEX IF EXISTS "subscriptions_one_active_per_user";

-- 2. Restore backed-up rows to active status
UPDATE subscriptions AS s
SET subscription_status = 'active',
    revoked_at = NULL,
    revoke_reason = NULL
FROM subscriptions_0013_backup AS b
WHERE s.id = b.id;

-- 3. Verify restored row count matches backup
-- SELECT count(*) FROM subscriptions_0013_backup;
-- Should match the number of rows updated above.

COMMIT;
```

If a full schema rollback is also needed (removes new columns entirely):

```sql
ALTER TABLE subscriptions DROP COLUMN IF EXISTS source;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS granted_by;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS grant_reason;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoked_by;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoke_reason;
```

### Option C: Manual Recovery

1. Query `subscriptions_0013_backup` to identify affected rows:
   ```sql
   SELECT id, user_id, backup_reason FROM subscriptions_0013_backup;
   ```
2. For `duplicate_active_subscription` rows: re-grant via admin API if the user should still have access.
3. For `expired_active_subscription` rows: verify with product whether these should remain expired.
4. Log all manual interventions with user IDs, actions taken, and timestamps.
5. Keep an incident log accessible to engineering and operations.

## 8. Backup Table Retention

`subscriptions_0013_backup` is retained for **90 days** post-deployment. After 90 days with no reported issues:

```sql
DROP TABLE IF EXISTS subscriptions_0013_backup;
```

If issues arise within the 90-day window, the backup table provides the audit trail for recovery.

## 9. Future Guardrails (Second-Order)

For future migrations that derive new state from historical data:

1. Split into phases when possible:
   - phase 1: add nullable columns + write-path support
   - phase 2: backfill after audited dry run
   - phase 3: enforce `NOT NULL`/constraints
2. Require preflight SQL outputs in PR description before approving migration.
3. Include an explicit backup table or snapshot strategy for any auto-expiration/update migration.
