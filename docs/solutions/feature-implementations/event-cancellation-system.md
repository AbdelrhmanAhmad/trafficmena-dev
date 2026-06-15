---
title: "Event Cancellation and Refund Request System"
category: feature
subcategory: event-management
tags:
  - event-cancellation
  - refund-workflow
  - status-machine
  - admin-approval
  - transactions
severity: feature
components:
  - server/src/routes/api/events.ts
  - server/src/db/schema/index.ts
  - server/drizzle/0007_strange_northstar.sql
  - src/features/events/components/CancellationRequestsList.tsx
  - src/app/api/events.ts
symptoms:
  - no-user-cancellation-option
  - no-refund-workflow
  - no-admin-visibility-into-requests
root_cause: |
  No workflow existed for users to cancel paid event registrations or request
  refunds. Admins had no visibility into cancellation requests.
resolution_date: 2026-01-26
commits:
  - c5d4ff0 # Event cancellation system with admin visibility
---

# Event Cancellation and Refund Request System

## Problem Summary

Users who registered for paid events had no way to cancel their registration or request a refund. Free event registrations could be cancelled, but paid events required a manual process involving contacting support.

**Business Requirements:**
1. Users can cancel free event registrations directly
2. Users can request cancellation of paid event registrations (enters approval queue)
3. Admins can view pending refund requests
4. Admins can approve (refund + cancel) or reject (keep registration) requests
5. Status transitions must be atomic to prevent race conditions

## Solution Architecture

### Status State Machine

```
Registration Status Flow:

   ┌──────────┐
   │  active  │
   └────┬─────┘
        │
        ├─────── (free event cancellation) ──────────► cancelled
        │
        └─────── (paid event cancellation) ────────► refund_requested
                                                           │
                     ┌─────────────────────────────────────┤
                     │                                     │
                     ▼                                     ▼
              ┌──────────┐                         ┌──────────────┐
              │  active  │ ◄── (admin rejects) ─── │   cancelled  │
              └──────────┘                         └──────────────┘
                                                          ▲
                                                          │
                                    (admin approves) ─────┘
```

**Valid Transitions:**
- `active` → `cancelled` (free event: user cancels)
- `active` → `refund_requested` (paid event: user requests cancellation)
- `refund_requested` → `cancelled` (admin approves refund)
- `refund_requested` → `active` (admin rejects, registration restored)
- `cancelled` → `active` (user re-registers)

### Database Schema Changes

**Migration: 0007_strange_northstar.sql**
```sql
-- Create registration status enum
CREATE TYPE "public"."registration_status" AS ENUM('active', 'cancelled', 'refund_requested');

-- Add new columns to event_attendees
ALTER TABLE "event_attendees" ADD COLUMN "status" "registration_status" DEFAULT 'active' NOT NULL;
ALTER TABLE "event_attendees" ADD COLUMN "cancelled_at" timestamp with time zone;
ALTER TABLE "event_attendees" ADD COLUMN "refund_requested_at" timestamp with time zone;
ALTER TABLE "event_attendees" ADD COLUMN "admin_note" text;

-- Index for efficient status queries
CREATE INDEX "event_attendees_status_idx" ON "event_attendees" USING btree ("status");
```

**Migration: 0008_nice_toad.sql**
```sql
-- Composite index for event + status queries
CREATE INDEX "event_attendees_event_status_idx" ON "event_attendees" USING btree ("event_id","status");
```

**Drizzle Schema:**
```typescript
// server/src/db/schema/index.ts
export const registrationStatusEnum = pgEnum('registration_status', [
  'active',
  'cancelled',
  'refund_requested',
]);

export const eventAttendees = pgTable('event_attendees', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: registrationStatusEnum('status').default('active').notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  refundRequestedAt: timestamp('refund_requested_at', { withTimezone: true }),
  adminNote: text('admin_note'),
  // ... other fields
}, (table) => ({
  // Indexes
  statusIdx: index('event_attendees_status_idx').on(table.status),
  eventStatusIdx: index('event_attendees_event_status_idx').on(table.eventId, table.status),
}));
```

### API Endpoints

#### User Cancellation: DELETE /events/:id/register

```typescript
// Handles both free and paid event cancellations
app.delete('/events/:id/register', async (c) => {
  const result = await db.transaction(async (tx) => {
    // Lock the registration row
    const [registration] = await tx
      .select({
        id: eventAttendees.id,
        status: eventAttendees.status,
        pricePaidCents: eventAttendees.pricePaidCents,
      })
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.userId, userId)
      ))
      .for('update')
      .limit(1);

    if (!registration) {
      throw new ApiError('NOT_REGISTERED', 'Not registered for this event.', 404);
    }

    if (registration.status === 'cancelled') {
      throw new ApiError('ALREADY_CANCELLED', 'Registration already cancelled.', 400);
    }

    if (registration.status === 'refund_requested') {
      throw new ApiError('REFUND_PENDING', 'Refund request already pending.', 400);
    }

    const isPaidRegistration = (registration.pricePaidCents ?? 0) > 0;

    if (isPaidRegistration) {
      // Request refund (admin approval needed)
      await tx
        .update(eventAttendees)
        .set({
          status: 'refund_requested',
          refundRequestedAt: new Date(),
        })
        .where(eq(eventAttendees.id, registration.id));

      return {
        success: true,
        message: 'Refund request submitted. An admin will review it shortly.',
        status: 'refund_requested',
      };
    }

    // Free event - cancel directly
    await tx
      .update(eventAttendees)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(eventAttendees.id, registration.id));

    return {
      success: true,
      message: 'Registration cancelled successfully.',
      status: 'cancelled',
    };
  });

  return c.json(result);
});
```

#### Admin: List Cancellation Requests

```typescript
// GET /events/:id/cancellation-requests
app.get('/events/:id/cancellation-requests', async (c) => {
  const admin = await requireAdmin(c);
  if ('response' in admin) return admin.response;

  const requests = await db
    .select({
      registrationId: eventAttendees.id,
      userId: eventAttendees.userId,
      email: users.email,
      name: profiles.name,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      pricePaidCents: eventAttendees.pricePaidCents,
      refundRequestedAt: eventAttendees.refundRequestedAt,
    })
    .from(eventAttendees)
    .leftJoin(users, eq(eventAttendees.userId, users.id))
    .leftJoin(profiles, eq(users.id, profiles.id))
    .where(and(
      eq(eventAttendees.eventId, eventId),
      eq(eventAttendees.status, 'refund_requested')
    ))
    .orderBy(desc(eventAttendees.refundRequestedAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({ items: requests, pagination: { page, pageSize, total } });
});
```

#### Admin: Approve Cancellation

```typescript
// POST /events/:id/cancellation-requests/:regId/approve
app.post('/events/:id/cancellation-requests/:regId/approve', async (c) => {
  const result = await db.transaction(async (tx) => {
    const [registration] = await tx
      .select({ id: eventAttendees.id, status: eventAttendees.status })
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.id, registrationId),
        eq(eventAttendees.eventId, eventId)
      ))
      .for('update')
      .limit(1);

    if (!registration) {
      throw new ApiError('REGISTRATION_NOT_FOUND', 'Registration not found.', 404);
    }

    if (registration.status !== 'refund_requested') {
      throw new ApiError('INVALID_STATUS', 'Not pending refund.', 400);
    }

    await tx
      .update(eventAttendees)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(eventAttendees.id, registrationId));

    return { success: true, message: 'Refund approved and registration cancelled.' };
  });

  return c.json(result);
});
```

#### Admin: Reject Cancellation

```typescript
// POST /events/:id/cancellation-requests/:regId/reject
app.post('/events/:id/cancellation-requests/:regId/reject', async (c) => {
  const { reason } = await c.req.json();

  const result = await db.transaction(async (tx) => {
    const [registration] = await tx
      .select({ id: eventAttendees.id, status: eventAttendees.status })
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.id, registrationId),
        eq(eventAttendees.eventId, eventId)
      ))
      .for('update')
      .limit(1);

    if (registration.status !== 'refund_requested') {
      throw new ApiError('INVALID_STATUS', 'Not pending refund.', 400);
    }

    await tx
      .update(eventAttendees)
      .set({
        status: 'active',
        refundRequestedAt: null,
        adminNote: reason?.trim() || null,
      })
      .where(eq(eventAttendees.id, registrationId));

    return { success: true, message: 'Refund rejected. Registration restored.' };
  });

  return c.json(result);
});
```

### Frontend Components

#### CancellationRequestsList.tsx

```typescript
// src/features/events/components/CancellationRequestsList.tsx
export function CancellationRequestsList({ eventId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['cancellation-requests', eventId],
    queryFn: () => fetchCancellationRequests(eventId),
    staleTime: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (registrationId: string) => approveCancellation(eventId, registrationId),
    onSuccess: () => {
      toast.success('Refund approved.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests', eventId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: string; reason?: string }) =>
      rejectCancellation(eventId, registrationId, reason),
    onSuccess: () => {
      toast.success('Refund rejected. Registration restored.');
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests', eventId] });
    },
  });

  // Render table with approve/reject buttons
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Pending Refund Requests ({data?.items.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>{/* ... render rows with actions */}</Table>
      </CardContent>
    </Card>
  );
}
```

#### API Client Functions

```typescript
// src/app/api/events.ts
export async function fetchCancellationRequests(
  eventId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<CancellationRequest>> {
  return fetchJson(`${API_BASE}/events/${eventId}/cancellation-requests?${query}`);
}

export async function approveCancellation(
  eventId: string,
  registrationId: string,
): Promise<{ success: boolean }> {
  return fetchJson(
    `${API_BASE}/events/${eventId}/cancellation-requests/${registrationId}/approve`,
    { method: 'POST' }
  );
}

export async function rejectCancellation(
  eventId: string,
  registrationId: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return fetchJson(
    `${API_BASE}/events/${eventId}/cancellation-requests/${registrationId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}
```

## Key Design Decisions

### 1. Status Column vs Separate Table
**Decision:** Use status column on `event_attendees`
**Rationale:** Simpler queries, atomic updates, single source of truth

### 2. Admin Approval for Paid Events
**Decision:** Paid cancellations require admin approval
**Rationale:** Refunds involve financial operations that need human review

### 3. FOR UPDATE Locks on All Status Transitions
**Decision:** Lock registration row before any status change
**Rationale:** Prevents race conditions (e.g., user cancels while admin approves)

### 4. Timestamp Fields for Audit Trail
**Decision:** Store `cancelledAt` and `refundRequestedAt`
**Rationale:** Enables reporting and debugging

### 5. Admin Note for Rejection Reason
**Decision:** Optional text field for rejection explanation
**Rationale:** Provides context for users and other admins

## Testing Checklist

```markdown
## Cancellation System Testing

### User Flow
- [ ] Free event registration can be cancelled directly
- [ ] Paid event cancellation creates refund request
- [ ] Cannot cancel already-cancelled registration
- [ ] Cannot cancel while refund is pending

### Admin Flow
- [ ] Can view pending refund requests
- [ ] Approve transitions to cancelled status
- [ ] Reject restores active status
- [ ] Rejection reason is stored

### Race Conditions
- [ ] Concurrent approve/reject is handled
- [ ] Concurrent user cancel/admin action is handled
- [ ] Re-registration respects capacity after cancellation
```

## Related Documentation

- [Pre-Launch Security Hardening](../security-issues/pre-launch-security-hardening.md)
- [Transaction Safety Patterns](../database-safety-patterns.md)
- [Branch Review Report](../../branch-review-important-enhancements.md)
