---
title: "fix: resolve P1/P2 code review findings"
type: fix
status: completed
date: 2026-02-18
source_branch: codex/legacy-members-fixes
---

# fix: resolve P1/P2 code review findings

10 targeted fixes from the multi-agent code review. Each fix addresses the root cause, not the symptom. No new abstractions, no new files, no new dependencies.

## P1 — CRITICAL (2 fixes)

### P1-1: Clear selections on search transition

**Root cause**: `selectedUserIds` is independent of search scope — selections from search A leak into search B invisibly.

**File**: `src/features/series/components/SeriesAccessManager.tsx:72-77`

```typescript
// BEFORE
const handleSearch = () => {
  const trimmed = searchInput.trim();
  if (trimmed === committedSearch) return;
  setCommittedSearch(trimmed);
  setGrantsPage(1);
};

// AFTER — clear stale selections when search scope changes
const handleSearch = () => {
  const trimmed = searchInput.trim();
  if (trimmed === committedSearch) return;
  setCommittedSearch(trimmed);
  setSelectedUserIds([]);
  setGrantsPage(1);
};
```

**Second-order check**: No other state depends on `selectedUserIds` during search transitions. The grant button count updates automatically via `selectedUserIds.length`. No cache invalidation needed.

- [x] Add `setSelectedUserIds([])` to `handleSearch`

---

### P1-2: Make subscription fields optional when `fields=basic`

**Root cause**: The `AdminUserRecord` type promises `is_subscriber: boolean` but the `fields=basic` backend path omits it. The type contract lies.

**Files**: `src/app/api/users.ts:62-72`

```typescript
// BEFORE
export type AdminUserRecord = {
  // ...
  is_subscriber: boolean;
  active_subscription_source: 'paid' | 'legacy' | 'gift' | null;
};

// AFTER — reflect that basic mode omits these fields
export type AdminUserRecord = {
  // ...
  is_subscriber?: boolean;
  active_subscription_source?: 'paid' | 'legacy' | 'gift' | null;
};
```

**Second-order check**: All consumers that read `is_subscriber` are in `users.tsx` (admin users page) which always calls `fetchUsersAdmin` with the default `fields=full`. The `SeriesAccessManager` uses `fields=basic` but never reads subscription fields — it only needs `id` and `email`. Making these optional doesn't break any existing callsite.

- [x] Make `is_subscriber` and `active_subscription_source` optional on `AdminUserRecord`
- [x] Check `users.tsx` for any direct `.is_subscriber` reads that need optional chaining — add `?? false` where boolean is needed

---

## P2 — IMPORTANT (8 fixes)

### P2-1: Guard Enter key during mutations

**Root cause**: `handleSearchKeyDown` calls `handleSearch()` unconditionally — the button has a `disabled` guard but the keyboard path doesn't.

**File**: `src/features/series/components/SeriesAccessManager.tsx:79-84`

```typescript
// AFTER
const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (!isAnyMutationPending) handleSearch();
  }
};
```

- [x] Add `!isAnyMutationPending` guard to keydown handler

---

### P2-2: Wrap revoke in transaction

**Root cause**: `revokeSubscriptionGrantRecord` runs a bare `db.update()` without transaction isolation, inconsistent with the create path.

**File**: `server/src/routes/api/subscriptionsGrants.ts:121-151`

Wrap the existing UPDATE in `db.transaction()`. No new logic — just consistency with the create path.

```typescript
// AFTER
async function revokeSubscriptionGrantRecord(params: {
  actorUserId: string;
  payload: RevokeSubscriptionGrantPayload;
  now: Date;
}): Promise<RevokeGrantResult> {
  return db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(subscriptions)
      .set({
        status: 'expired',
        endsAt: params.now,
        revokedAt: params.now,
        revokedBy: params.actorUserId,
        revokeReason: params.payload.reason,
      })
      .where(
        and(
          eq(subscriptions.userId, params.payload.userId),
          eq(subscriptions.status, 'active'),
          isNull(subscriptions.revokedAt),
          gte(subscriptions.endsAt, params.now),
          inArray(subscriptions.source, ['legacy', 'gift']),
        ),
      )
      .returning({ id: subscriptions.id });

    if (!revoked) return { type: 'not_found' };
    return { type: 'revoked', id: revoked.id };
  });
}
```

- [x] Wrap `revokeSubscriptionGrantRecord` in `db.transaction()`
- [x] Change `db.update` to `tx.update`

---

### P2-3: Use `normalizeRole` consistently

**Root cause**: PUT handler at line 486 uses raw cast without `.toLowerCase()`. DELETE handler at line 597 adds `.toLowerCase()` but still casts. Both should use the existing `normalizeRole` utility.

**File**: `server/src/routes/api/users.ts:486, 597`

```typescript
// Line 486 — PUT handler
// BEFORE: const currentRole = (target?.role ?? 'user') as (typeof roleValues)[number];
// AFTER:
const currentRole = normalizeRole(target?.role);

// Line 597 — DELETE handler
// BEFORE: const targetRole = (target?.role ?? 'user').toLowerCase() as (typeof roleValues)[number];
// AFTER:
const targetRole = normalizeRole(target?.role);
```

- [x] Add `normalizeRole` to the import from `./utils.js` (line 9)
- [x] Replace line 486 cast with `normalizeRole(target?.role)`
- [x] Replace line 597 cast with `normalizeRole(target?.role)`

---

### P2-4: Derive NOT EXISTS from shared selector

**Root cause**: The `NOT EXISTS` SQL in the subscription filter duplicates the `EXISTS` logic instead of using the shared helper. If the active subscription condition changes, the inline SQL diverges.

**File**: `server/src/routes/api/users.ts:31-50, 138-146`

Add `notExists` to `getActiveSubscriptionSelectors`:

```typescript
const getActiveSubscriptionSelectors = (now: Date) => ({
  exists: sql<boolean>`EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
  )`,
  notExists: sql<boolean>`NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
  )`,
  source: sql<'paid' | 'legacy' | 'gift' | null>`(
    SELECT s.source FROM subscriptions s
    WHERE s.user_id = ${users.id}
      AND s.subscription_status = 'active'
      AND s.revoked_at IS NULL
      AND s.ends_at >= ${now}
    ORDER BY s.ends_at DESC LIMIT 1
  )`,
});
```

Then at line 138:

```typescript
} else if (!isBasicFields && subscription === 'not_subscribed') {
  filters.push(subscriptionSelectors.notExists);
}
```

- [x] Add `notExists` selector to `getActiveSubscriptionSelectors`
- [x] Replace inline `NOT EXISTS` SQL at line 138-146 with `subscriptionSelectors.notExists`

---

### P2-5: Add `keepPreviousData` to grants query

**Root cause**: When a revoke on the last page triggers page clamping, the grants table flashes "Loading" because there's no cached data for the clamped page.

**File**: `src/features/series/hooks/useSeriesGrants.ts:13-20`

```typescript
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useSeriesGrants(seriesId: string, params: FetchSeriesGrantsParams = {}) {
  return useQuery({
    queryKey: grantsQueryKey(seriesId, params),
    queryFn: ({ signal }) => fetchSeriesGrants(seriesId, params, signal),
    enabled: Boolean(seriesId),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}
```

- [x] Import `keepPreviousData` from `@tanstack/react-query`
- [x] Add `placeholderData: keepPreviousData` to `useSeriesGrants`

---

### P2-6: Block subscription dialog hijacking

**Root cause**: The `onManageSubscription` handler in `users.tsx` doesn't check if a dialog is already open. Clicking a different row's action while the dialog is open switches the target user, losing any typed reason.

**File**: `src/pages/admin/users.tsx:485-492`

```typescript
// AFTER — guard against open dialog
onManageSubscription={(payload) => {
  if (subscriptionDialog) return;
  setSubscriptionDialog(payload);
  setSubscriptionReason(
    payload.mode === 'grant'
      ? 'Legacy yearly subscription grant'
      : 'Legacy or gift subscription revoked',
  );
}}
```

- [x] Add `if (subscriptionDialog) return;` guard at line 486

---

### P2-7: Replace manual types with Zod inference

**Root cause**: Manual `CreateSubscriptionGrantPayload` and `RevokeSubscriptionGrantPayload` types duplicate what the Zod schemas define. If the schema changes, the types silently drift.

**File**: `server/src/routes/api/subscriptionsGrants.ts:16-25`

```typescript
// BEFORE
type CreateSubscriptionGrantPayload = {
  userId: string;
  source: 'legacy' | 'gift';
  reason: string;
};
type RevokeSubscriptionGrantPayload = {
  userId: string;
  reason: string;
};

// AFTER — derive from Zod schemas
import type { z } from 'zod';

type CreateSubscriptionGrantPayload = z.infer<typeof createSubscriptionGrantSchema>;
type RevokeSubscriptionGrantPayload = z.infer<typeof revokeSubscriptionGrantSchema>;
```

Note: `createSubscriptionGrantSchema` and `revokeSubscriptionGrantSchema` are already imported from `./subscriptionsGrantsCsv.js` (line 8-11).

- [x] Replace manual type definitions with `z.infer<typeof ...>` (lines 16-25)
- [x] Add `import type { z } from 'zod'` if not present

---

### P2-8: Type CSV upload error payloads

**Root cause**: `response.json()` returns `any` in error paths. Silent typos possible.

**Files**: `src/app/api/seriesGrants.ts:91`, `src/app/api/subscriptions.ts:120`

Add a shared type at the top of each file (or extract to `client.ts` if preferred, but MVP says inline):

```typescript
type ApiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
    errors?: Array<{ line: number; email: string; reason: string }>;
  };
};
```

Then type the json call:

```typescript
// BEFORE
const payload = await response.json();

// AFTER
const payload: ApiErrorPayload = await response.json();
```

- [x] Add `ApiErrorPayload` type to `src/app/api/seriesGrants.ts`
- [x] Type `response.json()` at line 91
- [x] Add `ApiErrorPayload` type to `src/app/api/subscriptions.ts`
- [x] Type `response.json()` at line 120

---

## Execution Order

All fixes are independent — no dependencies between them. Group by file to minimize context switches:

1. **`SeriesAccessManager.tsx`** — P1-1, P2-1 (2 changes, same file)
2. **`src/app/api/users.ts`** — P1-2 (type change)
3. **`server/src/routes/api/users.ts`** — P2-3, P2-4 (import + 3 edits)
4. **`server/src/routes/api/subscriptionsGrants.ts`** — P2-2, P2-7 (transaction wrap + type inference)
5. **`src/features/series/hooks/useSeriesGrants.ts`** — P2-5 (1 import + 1 line)
6. **`src/pages/admin/users.tsx`** — P2-6 (1-line guard)
7. **`src/app/api/seriesGrants.ts` + `subscriptions.ts`** — P2-8 (type + cast)

## Acceptance Criteria

- [x] Admin search → select user → new search → selections are cleared (P1-1)
- [x] `AdminUserRecord.is_subscriber` is optional — no TypeScript errors in `users.tsx` (P1-2)
- [x] Enter key during mutation does not trigger search (P2-1)
- [x] `revokeSubscriptionGrantRecord` runs inside `db.transaction()` (P2-2)
- [x] Both PUT and DELETE user handlers use `normalizeRole()` (P2-3)
- [x] `NOT EXISTS` filter uses shared selector, no inline SQL (P2-4)
- [x] Grants table shows previous data during page transitions (P2-5)
- [x] Clicking subscription action while dialog is open is a no-op (P2-6)
- [x] No manual type definitions duplicate Zod schemas in `subscriptionsGrants.ts` (P2-7)
- [x] `response.json()` in CSV error paths is typed (P2-8)
- [x] `npm run lint` passes
- [x] `npm run test:unit` passes
