---
date: 2025-02-04
topic: plunk-api-migration
type: chore
priority: high
---

# Plunk API Migration to New Platform

## Overview

Migrate from the old Plunk API (`api.useplunk.com`) to the new platform (`next-api.useplunk.com`). This is a minimal, MVP-focused migration that changes only what's necessary.

## Why This Change

Plunk migrated to a new platform with a different API base URL. The old endpoint will eventually be deprecated. Domain is already verified in the new Plunk dashboard.

## What Changes

| File | Change | Lines |
|------|--------|-------|
| `server/src/services/email.ts` | Update endpoint URL | 1 |
| `server/src/app.ts` | Add new domain to CSP whitelist | 1 |
| `server/.env` | Update API key (manual) | 1 |
| `server/.env.example` | Update comment | 0 |

**Total: ~3 lines of code changed**

## What Stays the Same

- ✅ `from` + `name` fields (compatible with new API)
- ✅ `text` field for plain text fallback (keep it, may still work)
- ✅ Error handling (HTTP status codes still reliable)
- ✅ All HTML email templates
- ✅ Rate limiting logic
- ✅ Better Auth OTP integration

## Implementation Steps

### Step 1: Update endpoint URL

**File:** `server/src/services/email.ts:18`

```typescript
// Before
const PLUNK_ENDPOINT = 'https://api.useplunk.com/v1/send';

// After
const PLUNK_ENDPOINT = 'https://next-api.useplunk.com/v1/send';
```

### Step 2: Update CSP whitelist

**File:** `server/src/app.ts:15`

```typescript
// Before
connectSources.add('https://api.useplunk.com');

// After
connectSources.add('https://next-api.useplunk.com');
```

### Step 3: Update API key in environment

**Manual step** - Get new secret key from new Plunk dashboard and update:

```bash
# server/.env
PLUNK_API_KEY=sk_your_new_key_from_plunk_dashboard
```

## Verification Plan

1. **Local test:** Start dev server, request OTP, verify email arrives
2. **Staging test:** Deploy to staging, test full login flow
3. **Production:** Deploy and monitor email delivery

## Rollback Plan

If emails fail after deployment:
1. Revert endpoint URL back to `https://api.useplunk.com/v1/send`
2. Revert CSP whitelist
3. Use old API key if still valid

## Acceptance Criteria

- [ ] OTP emails deliver successfully (requires testing with new API key)
- [ ] Invitation emails deliver successfully (requires testing with new API key)
- [ ] No console errors in server logs
- [ ] Email content renders correctly (HTML styling intact)

## Completed Steps

- [x] Step 1: Update endpoint URL (`server/src/services/email.ts:18`)
- [x] Step 2: Update CSP whitelist (`server/src/app.ts:15`)

## Out of Scope (YAGNI)

Per MVP mindset, these are explicitly NOT included:
- TypeScript types for API response (current error handling works)
- Extracting shared email function (code is simple enough)
- Adding tests (existing behavior unchanged)
- Using new Plunk features (templates, attachments, etc.)

## References

- New Plunk API docs: https://next-wiki.useplunk.com/api-reference/overview
- Current email service: `server/src/services/email.ts`
- CSP config: `server/src/app.ts`
