---
title: "fix: Resolve P1/P2 findings + series grant search bottleneck"
type: fix
status: completed
date: 2026-02-18
branch: codex/legacy-members-fixes
scale: "~500 grants/series, 3-4 legacy series"
---

# fix: Resolve P1/P2 findings + series grant search bottleneck

## Goal

Ship the `codex/legacy-members-fixes` branch. Fix the P1 (blocks merge), remaining P2s, and the user-reported search slowness. All P3s deferred to `docs/plans/2026-02-18-p3-backlog-deferred.md`.

## Scale Context

- Max ~500 grants per series, 3-4 legacy series
- ~2K total users in the platform
- Admin-only feature (managers+), low concurrency

---

## Fix A — Search Bottleneck (user-reported: >1 min wait)

**Files**: `src/features/series/components/SeriesAccessManager.tsx`, `src/app/api/seriesGrants.ts`

### Root Cause

`SeriesAccessManager.tsx:111-116` fires `fetchAllSeriesGrantUserIds()` on every debounced search. This function (`seriesGrants.ts:45-103`) runs a **sequential pagination loop** — up to 50 pages × 200 items — just to build a `Set<string>` of already-granted user IDs. That Set is then used to filter 20 search results.

At 500 grants/series: 3 sequential HTTP requests × ~200ms each = ~600ms minimum.
At larger scales or slow networks: easily >1 minute.

The entire loop exists solely to hide already-granted users from the checkbox list.

### Fix (remove the bottleneck entirely)

1. **Remove `allGrantedUserIdsQuery`** (lines 111-116) and its import of `fetchAllSeriesGrantUserIds`
2. **Remove `grantedUserIds` Set** (lines 118-121) and `selectableUsers` filter (line 129-131)
3. **Show all search results directly** from `usersQuery.data?.items` with checkboxes
4. **Remove the `selectedUserIds` cleanup effect** that depends on `grantedUserIds` (lines 123-125)
5. **Simplify error handling** — remove `allGrantedUserIdsQuery.error` checks (lines 133-137) and loading checks for `allGrantedUserIdsQuery` (line 278, 284)

### Why This Is Safe

- **Backend idempotency**: The grant API uses `onConflictDoNothing` (`seriesGrants.ts:197-200`). Granting an already-granted user is a no-op.
- **Clear feedback**: The toast already shows `"X granted, Y already active"` (`SeriesAccessManager.tsx:168-170`).
- **Active grants table**: The "Active grants" table at the bottom of the same component shows all current grants — the admin can visually verify before granting.
- **Zero data risk**: No duplicate rows can be created due to the partial unique index `series_access_grants_active_unique`.

### UX Change

| Before | After |
|--------|-------|
| Search shows only users WITHOUT grants (slow) | Search shows all matching users (fast) |
| Admin sees "All matching users already have access" | Admin selects users, toast says "0 granted, 3 already active" |
| Loading takes >1 minute | Loading takes <1 second |

### Second-Order Check

- `fetchAllSeriesGrantUserIds` is only imported in `SeriesAccessManager.tsx`. Removing it has no cascade.
- `useSeriesGrants.ts` still invalidates `['series-granted-user-ids', seriesId]` in `onSettled`. After removing the query that uses this key, those invalidations become harmless no-ops (TanStack Query ignores invalidations for non-existent query keys). Clean them up in a follow-up.
- The `fetchAllSeriesGrantUserIds` function in `seriesGrants.ts` can be removed entirely since nothing else imports it.

---

## Fix B — P1: Backup Table Inherits FK CASCADE (migration 0013)

**File**: `server/drizzle/0013_blue_luckman.sql:76`

### Root Cause

```sql
CREATE TABLE IF NOT EXISTS "subscriptions_0013_backup" (LIKE "subscriptions" INCLUDING ALL);
```

`INCLUDING ALL` copies FK constraints including `ON DELETE CASCADE` from the `users` table. If a user is deleted between migration and rollback, their backup row is silently cascade-deleted — destroying the rollback safety net.

### Fix

Add `ALTER TABLE ... DROP CONSTRAINT` statements after the backup table creation to remove inherited FKs. This is safe because:
- The backup table is only used for data preservation, not referential integrity
- The `IF NOT EXISTS` on the CREATE means this runs idempotently

After line 76, add:

```sql
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'subscriptions_0013_backup'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE "subscriptions_0013_backup" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
```

### Second-Order Check

- This only touches the backup table, not the live `subscriptions` table
- The backup table's unique index (`subscriptions_0013_backup_id_unique`) is NOT a FK and is preserved
- Idempotent: if no FKs exist, the loop body never executes

---

## Fix C — Debounce + Page Reset Race (SeriesAccessManager)

**File**: `src/features/series/components/SeriesAccessManager.tsx:73-83`

### Root Cause

Two separate `useEffect` hooks: one sets `debouncedSearch` (line 73-78), another resets `grantsPage` to 1 (line 81-83). React batches state updates within a single event handler but NOT across separate effects. This causes a phantom API request with the NEW search term but the OLD page number, followed by a corrective request with page 1.

### Fix

Combine both updates into a single `useEffect`, matching the pattern already used in `users.tsx:107-114`:

```typescript
useEffect(() => {
  const timeout = window.setTimeout(() => {
    setDebouncedSearch(searchInput.trim());
    setGrantsPage(1);
  }, 300);
  return () => window.clearTimeout(timeout);
}, [searchInput]);
```

Remove the separate `useEffect` that resets `grantsPage` (lines 80-83).

### Second-Order Check

- Both state updates happen in the same microtask → React batches them → single render → single API call
- The `grantsPage` clamp effect (lines 99-102) still provides safety if total shrinks independently

---

## Fix D — Pagination Buttons Clickable During Debounce (SeriesAccessManager)

**File**: `src/features/series/components/SeriesAccessManager.tsx:416-440`

### Root Cause

`users.tsx` correctly disables pagination with `isDebouncing`; `SeriesAccessManager` does not. During the 300ms debounce window, clicking pagination changes the page, then debounce resets it to 1 — causing a visual snap.

### Fix

Derive `isDebouncing` and disable pagination buttons:

```typescript
const isDebouncing = searchInput.trim() !== debouncedSearch;
```

Add to both pagination button `disabled` props:

```typescript
disabled={grantsPage === 1 || isDebouncing}       // prev
disabled={grantsPage >= grantsTotalPages || isDebouncing}  // next
```

### Second-Order Check

- `isDebouncing` is a derived value, not state — no extra re-renders
- When debounce settles, buttons re-enable automatically

---

## Fix E — Subscription Hooks: onSuccess → onSettled

**File**: `src/app/hooks/useSubscriptions.ts:57-91`

### Root Cause

`useCreateSubscriptionGrant`, `useRevokeSubscriptionGrant`, and `useBulkSubscriptionGrants` all use `onSuccess` for cache invalidation. If the mutation fails AFTER the server commits (e.g., network timeout on response), the cache stays stale. The series grant hooks (`useSeriesGrants.ts`) already correctly use `onSettled`.

### Fix

Change `onSuccess` to `onSettled` in all three hooks (lines 59, 72, 85). No other changes needed — the invalidation logic is identical.

### Second-Order Check

- `onSettled` fires on both success and error. Invalidating on error is safe — it just re-fetches fresh data.
- The `useUpdateSubscriptionSettings` hook (line 28-34) uses `onSuccess` with `setQueryData` (optimistic update). Leave this one as `onSuccess` — it's a settings update, not a grant mutation, and uses `setQueryData` which should only run on success.

---

## Fix F — Mutual Exclusion on Users Page Subscription Mutations

**File**: `src/pages/admin/users.tsx:417`

### Root Cause

The bulk CSV upload input only checks `bulkSubscriptionGrantMutation.isPending`. An admin can fire a CSV upload while an individual grant/revoke is in flight. `SeriesAccessManager.tsx` correctly guards this with `isAnyMutationPending`.

### Fix

Derive a combined pending flag and apply it to all mutation surfaces:

```typescript
const isAnySubscriptionMutationPending =
  createSubscriptionGrantMutation.isPending ||
  revokeSubscriptionGrantMutation.isPending ||
  bulkSubscriptionGrantMutation.isPending;
```

Apply `isAnySubscriptionMutationPending` to:
- Bulk CSV upload input `disabled` prop (line 417)
- Individual grant/revoke buttons in the subscription dialog
- Dialog close/cancel buttons

### Second-Order Check

- This mirrors the exact pattern already working in `SeriesAccessManager.tsx`
- Only affects admin-facing UI; no API-level changes

---

## Fix G — Commit Rate Limit Key Fix (already coded)

**Files**: `server/src/routes/api/utils.ts` (uncommitted), `tests/unit/rate-limit-keying.test.ts` (untracked)

### What

The uncommitted change removes the IP-appending behavior from `consumeRateLimit`. The old behavior appended the client's IP to the rate limit key, creating a bypass vector: an attacker rotating IPs could exceed per-actor limits.

### Action

Commit the existing uncommitted changes. No code changes needed — just stage and commit:
- `server/src/routes/api/utils.ts`
- `tests/unit/rate-limit-keying.test.ts`
- `server/src/routes/api/seriesGrants.ts` (uses `jsonPayloadErrorStatusCode`)
- `server/src/routes/api/subscriptions.ts` (uses `jsonPayloadErrorStatusCode`)
- `tests/unit/json-body-parser.test.ts` (new test)
- `tests/unit/series-grants-api.test.ts` (new test)
- `server/package.json` + `server/package-lock.json` (Hono bump)
- `server/src/config/requestLimits.ts` (extracted constant)

### Second-Order Check

- All callers already use identity-scoped keys (`series-grant:create:${actor.userId}`, etc.)
- No caller depended on the IP-appending behavior

---

## Fix H — Revoke Consistency Constraint (documentation, not code)

**File**: `server/drizzle/0014_add_subscription_check_constraints.sql:44-49`

### Current State

The CHECK constraint allows `revoked_at IS NOT NULL` with `revoked_by IS NULL` and `revoke_reason IS NULL`. This is intentionally permissive — the migration's `COALESCE(revoke_reason, 'Auto-expired...')` backfill creates rows where `revoked_at` is set but `revoked_by` is NULL (system action).

### Action

Document this as intentional behavior. No constraint change needed. Tightening would require backfilling `revoked_by` for all auto-expired rows with a system user ID that doesn't exist.

Add a SQL comment in the migration above the constraint:

```sql
-- Permissive by design: revoked_at can be NOT NULL with revoked_by/revoke_reason NULL
-- for system-initiated revocations (auto-expiry, migration cleanup).
```

---

## Fix I — Pre-Deploy Verification SQL + Rollback Docs

### Pre-Deploy Verification (Finding #9)

Run against production read-replica before deploying:

```sql
SELECT id, user_id, payment_id, price_paid_cents
FROM subscriptions
WHERE payment_id IS NULL AND COALESCE(price_paid_cents, 0) <= 0;
```

This validates the legacy heuristic used by migration 0013 to tag `source = 'legacy'`. Document in `docs/runbooks/subscriptions-0013-migration-audit.md`.

### Rollback Script (Finding #10)

Document rollback SQL in the same runbook:

```sql
-- 1. Drop the unique index
DROP INDEX IF EXISTS "subscriptions_one_active_per_user";

-- 2. Restore backed-up rows
UPDATE subscriptions AS s
SET subscription_status = 'active',
    revoked_at = NULL,
    revoke_reason = NULL
FROM subscriptions_0013_backup AS b
WHERE s.id = b.id;

-- 3. (Optional) Drop new columns if full rollback needed
ALTER TABLE subscriptions DROP COLUMN IF EXISTS source;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS granted_by;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS grant_reason;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoked_by;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS revoke_reason;
```

---

## Implementation Order

| # | Fix | Risk | Effort | Dependencies |
|---|-----|------|--------|-------------|
| 1 | **G**: Commit uncommitted changes | Low | Commit only | None |
| 2 | **A**: Remove search bottleneck | Low | ~30 min | None |
| 3 | **B**: Fix backup table FKs | Medium | ~15 min | None |
| 4 | **C**: Combine debounce + page reset | Low | ~5 min | None |
| 5 | **D**: Disable pagination during debounce | Low | ~5 min | After C |
| 6 | **E**: onSuccess → onSettled | Low | ~5 min | None |
| 7 | **F**: Mutual exclusion on users page | Low | ~10 min | None |
| 8 | **H**: Document revoke constraint | Low | ~5 min | None |
| 9 | **I**: Verification SQL + rollback docs | Low | ~15 min | None |

Fixes 1-3, 6-7 are independent and can be done in parallel.
Fixes 4-5 touch the same component — do sequentially after Fix A.

---

## Validation Gate (before merge)

1. `npm run test:unit` — all tests pass
2. `npm run lint` — no lint errors
3. `npm run build && npm --prefix server run build` — builds clean
4. Manual smoke test: search for a user email in series grant manager → result appears in <2 seconds
5. Manual smoke test: grant a user who already has access → toast says "0 granted, 1 already active"

---

## What Is NOT In This Plan

All P3 items (10 findings) are deferred. See `docs/plans/2026-02-18-p3-backlog-deferred.md`.
