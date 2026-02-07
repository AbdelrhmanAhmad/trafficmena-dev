# Increase Daily Invitation Limit from 50 to 1,000 (Configurable)

**Type:** enhancement
**Priority:** High (launch blocker)
**Date:** 2025-02-04
**Approach:** Option A - Per-admin limit with env var (simplest)

## Overview

Increase the daily invitation limit from 50 to 1,000 per admin via a configurable environment variable. This is the minimal change needed to unblock launch activities.

## Problem Statement

The current hardcoded limit of 50 invitations per admin per day blocks launch operations with thousands of people to invite.

## Solution

Change the hardcoded `DAILY_LIMIT = 50` to use an environment variable with default 1000.

### Implementation (3 lines changed)

**1. `server/src/config/env.ts`** - Add env var to schema:
```typescript
INVITATION_DAILY_LIMIT: z.coerce.number().min(1).default(1000),
```

**2. `server/src/services/invitations.ts`** - Use env var:
```typescript
import { env } from '../config/env.js';
// ...
const DAILY_LIMIT = env.INVITATION_DAILY_LIMIT;
```

### Files to Modify

| File | Change |
|------|--------|
| `server/src/config/env.ts` | Add `INVITATION_DAILY_LIMIT` to Zod schema |
| `server/src/services/invitations.ts` | Import `env`, use `env.INVITATION_DAILY_LIMIT` |

## Acceptance Criteria

- [x] `INVITATION_DAILY_LIMIT` environment variable works (default: 1000)
- [x] Limit enforced per admin (unchanged behavior, just higher number)
- [x] Existing single and bulk invitation flows work unchanged
- [x] Error message shows correct limit when reached

## Testing Plan

1. Set `INVITATION_DAILY_LIMIT=3` in `.env`
2. Send 3 invitations → should succeed
3. Send 4th invitation → should fail with "Daily invitation limit reached (3/day)"
4. Restart server without env var → should default to 1000

## What's NOT Changing

- Per-admin counting logic stays the same
- Database schema unchanged
- API responses unchanged
- Frontend display (can update later if needed)

## Rollback

Set `INVITATION_DAILY_LIMIT=50` in environment to revert to original behavior.

## References

- `server/src/services/invitations.ts:31` - Current hardcoded limit
- `server/src/config/env.ts` - Existing env var patterns
