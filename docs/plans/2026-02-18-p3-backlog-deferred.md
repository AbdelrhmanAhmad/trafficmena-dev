---
title: "P3 Backlog — Deferred from codex/legacy-members-fixes"
type: chore
status: backlog
date: 2026-02-18
source_branch: codex/legacy-members-fixes
priority: low
---

# P3 Backlog — Deferred from Legacy Members Branch

These 10 findings were identified during the code review of `codex/legacy-members-fixes` and rated P3 (nice-to-have). None are bugs, none affect users, and none block the merge. Handle in a follow-up `chore/code-cleanup` branch when convenient.

---

## #11 — Replace custom JSON body size limiter with Hono `bodyLimit`

**Files**: `server/src/routes/api/jsonPayload.ts`, `server/src/app.ts`

`jsonPayload.ts` implements a custom streaming size check (~95 LOC). Hono's built-in `bodyLimit` middleware does the same thing. Replacing it saves ~95 lines and uses framework-standard behavior.

**Risk**: Low. Hono's `bodyLimit` returns 413 automatically. Verify the error response shape matches the existing `PAYLOAD_TOO_LARGE` format.

---

## #12 — Remove unsafe `as` casts on frontend API error payloads

**Files**: `src/features/series/components/SeriesAccessManager.tsx`, `src/pages/admin/users.tsx`

The CSV upload error handlers cast errors to `Error & { extra?: ... }`. These were partially fixed (now use `ApiError`), but validate that no remaining unsafe casts exist across both files.

**Risk**: Very low. Type-only change.

---

## #13 — DI pattern inconsistency between subscription and series grants

**Files**: `server/src/routes/api/subscriptionsGrants.ts`, `server/src/routes/api/seriesGrants.ts`

`subscriptionsGrants.ts` has a full DI layer (`RegisterSubscriptionGrantRoutesDeps` type, `defaultDeps`). `seriesGrants.ts` uses direct imports. The DI layer has zero test consumers.

**Options**:
- Remove DI from subscriptionsGrants.ts (match seriesGrants.ts pattern)
- Add DI to seriesGrants.ts (if tests are planned)

**Recommendation**: Remove the DI. YAGNI. Add it back if/when tests need seams.

---

## #14 — Split `users.tsx` (828 LOC)

**File**: `src/pages/admin/users.tsx`

Exceeds the 500 LOC guideline. Extract into focused components:
- `UserRoleSelect` — role dropdown with confirmation
- `SubscriptionDialog` — grant/revoke dialog
- `BulkSubscriptionUpload` — CSV upload section
- `UserTable` — table with pagination

**Risk**: Medium. Behavior parity must be preserved. Extract only presentational concerns; keep state management in the parent.

---

## #15 — Multipart CSV uploads buffered before size check

**Files**: Series and subscription bulk grant endpoints

Admin-only endpoints buffer the entire CSV in memory before checking size. At current scale (admin-only, small files), this is a non-issue.

**Fix when ready**: Add route-level `bodyLimit` middleware on the bulk endpoints before the multipart parser runs.

---

## #16 — CSV upload functions not cancellable (no AbortSignal)

**Files**: `src/app/api/seriesGrants.ts:137`, `src/app/api/subscriptions.ts:104`

`createSeriesGrantsFromCsv` and `createSubscriptionGrantsFromCsv` use raw `fetch()` without accepting an `AbortSignal`. If the admin navigates away mid-upload, the request completes in the background.

**Fix when ready**: Add optional `signal` parameter, pass to `fetch()`.

---

## #17 — Subscription dialog captures stale user snapshot

**File**: `src/pages/admin/users.tsx`

`subscriptionDialog` stores a full `AdminUserRecord` at click time. If the users list refreshes (e.g., from another admin's action), the dialog shows stale data.

**Fix when ready**: Store only `userId` in dialog state, look up current data from the query cache at render time.

---

## #18 — `CreateGrantResult` manually duplicates Drizzle schema types

**File**: `server/src/routes/api/subscriptionsGrants.ts`

Result types are manually defined instead of using Drizzle's `InferSelectModel` or `typeof table.$inferSelect`.

**Fix when ready**: Replace manual types with Drizzle inferred types.

---

## #19 — Duplicated CSV upload fetch pattern

**Files**: `src/app/api/seriesGrants.ts:137-167`, `src/app/api/subscriptions.ts:104-135`

Both CSV upload functions have identical `FormData` + `fetch()` + error handling logic. Extract a shared `uploadCsvWithAuth(url, file)` helper.

**Risk**: Low. Both call sites have identical structure.

---

## #20 — `requestLimits.ts` single-constant file

**File**: `server/src/config/requestLimits.ts`

Contains a single constant (`JSON_BODY_LIMIT_BYTES`). Could be folded into `jsonPayload.ts` or `server/src/routes/api/utils.ts`.

**Fix when ready**: Move the constant, update imports.

---

## Priority Order (if/when addressed)

1. **#13** (DI removal) — reduces confusion, 5 min
2. **#19** (shared CSV helper) — reduces duplication, 15 min
3. **#14** (users.tsx split) — improves maintainability, 30 min
4. **#12** (unsafe casts) — type safety, 10 min
5. Rest — as time permits
