---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, performance, payment-gateway, database]
dependencies: []
---

# P2: N+1 Query Pattern in calculatePrice()

## Problem Statement

The `calculatePrice()` function executes 3-6 sequential database queries for each checkout request. This creates performance bottlenecks under concurrent load.

**Impact:**
- 100 concurrent checkouts = 300-600 database queries
- Potential database saturation during flash sales

## Findings

**Location:** `server/src/routes/api/payments.ts` lines 195-347

```typescript
// Query 1: Fetch subscription status
const [subscription] = await db.select().from(subscriptions).where(...);

// Query 2: Fetch platform settings
const [settings] = await db.select().from(platformSettings).limit(1);

// Query 3: Fetch event details
const [event] = await db.select().from(events).where(eq(events.id, itemId));

// Query 4: Fetch track event settings
const [trackEvent] = await db.select({...}).from(trackEvents)...;

// Query 5: Check existing registration
const [existingReg] = await db.select().from(eventAttendees).where(...);

// Query 6: Count attendees
const [countResult] = await db.select({ count: ... }).from(eventAttendees)...;
```

## Proposed Solutions

### Solution 1: Parallel Query Execution (Recommended)
**Pros:** 50-70% latency reduction, minimal refactor
**Cons:** Slightly more complex code
**Effort:** 2-3 hours
**Risk:** Low

```typescript
const [subscriptionResult, settingsResult, itemResult] = await Promise.all([
  db.select().from(subscriptions).where(...),
  db.select().from(platformSettings).limit(1),
  // Combined item query with joins
]);
```

### Solution 2: Single CTE Query
**Pros:** Maximum efficiency
**Cons:** Complex SQL, harder to maintain
**Effort:** 4-6 hours
**Risk:** Medium

## Recommended Action

Implement Solution 1 before scaling beyond MVP.

## Technical Details

**Affected Files:**
- `server/src/routes/api/payments.ts`

## Acceptance Criteria

- [ ] Independent queries execute in parallel
- [ ] Checkout latency reduced by 50%+
- [ ] No functional changes to price calculation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-01-16 | Created from code review | Sequential queries don't scale |

## Resources

- Performance Oracle review finding
