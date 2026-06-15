# Plan: Fix Event Price Display & Add Subscribe Navigation

## Problem Summary

Two critical issues in the payment gateway implementation:

1. **Price Bug**: Event prices are not being saved or displayed - data is lost after form submission
2. **Subscribe Page Missing from Navigation**: The `/subscribe` page exists but is not accessible from any menu

---

## Root Cause Analysis (Validated)

### Issue 1: Price Data Not Being Saved or Returned

**Root Cause**: The backend API in `server/src/routes/api/events.ts` has incomplete implementation. The `priceInCents` field was added to:
- Database schema (correct)
- Zod validation schema (correct)
- Frontend form and display (correct)

**BUT never wired up in the actual database operations:**
- `GET /events` (list) - does NOT select `priceInCents`
- `GET /events/:id` - does NOT select `priceInCents`
- `POST /events` - does NOT insert `priceInCents`
- `PUT /events/:id` - does NOT update `priceInCents`

**Data Flow Trace:**
```
User enters price (100 EGP) in AdminEventForm
    |
    v
Form converts to cents: priceInCents = 10000
    |
    v
POST /api/events receives payload with priceInCents
    |
    v
*** BUG: .insert().values() does NOT include priceInCents ***
    |
    v
Database: price_in_cents column = NULL (never saved)
    |
    v
GET /api/events/:id returns event WITHOUT priceInCents
    |
    v
Frontend receives: { priceInCents: undefined }
    |
    v
EventDetail.tsx: isPaidEvent = false (price not shown)
AdminEventForm.tsx: priceEgp = '' (empty field on edit)
```

### Issue 2: Subscribe Page Missing from Navigation

**Root Cause**: The Subscribe page infrastructure is complete but no navigation links were added.

**Evidence:**
- Page exists: `src/pages/Subscribe.tsx` (220 lines, fully functional)
- Route exists: `src/App.tsx` lines 280-289 (`/subscribe` protected route)
- Hooks exist: `src/app/hooks/useSubscriptions.ts` (all hooks functional)

**Missing From:**
- `src/shared/components/layout/Header.tsx` - main navigation (lines 18-24)
- `src/shared/components/layout/UserProfileDropdown.tsx` - user dropdown
- `src/shared/components/layout/AppLayout.tsx` - sidebar menu

---

## Implementation Plan

### Backend Tasks

#### B001: Add priceInCents to GET /events/:id Response

**File**: `server/src/routes/api/events.ts`
**Location**: Lines 233-245

**Change**: Add `priceInCents` to the select statement

```typescript
const [event] = await db
  .select({
    id: events.id,
    title: events.title,
    eventDescription: events.eventDescription,
    date: events.date,
    location: events.location,
    maxAttendees: events.maxAttendees,
    meetingLink: events.meetingLink,
    imageUrl: events.imageUrl,
    tags: events.tags,
    eventType: events.eventType,
    priceInCents: events.priceInCents,  // ADD THIS
  })
```

---

#### B002: Add priceInCents to GET /events List Response

**File**: `server/src/routes/api/events.ts`
**Location**: Lines 180-200

**Change**: Add `priceInCents` to the select statement

```typescript
const items = await db
  .select({
    id: events.id,
    title: events.title,
    eventDescription: events.eventDescription,
    date: events.date,
    location: events.location,
    maxAttendees: events.maxAttendees,
    meetingLink: events.meetingLink,
    imageUrl: events.imageUrl,
    tags: events.tags,
    eventType: events.eventType,
    priceInCents: events.priceInCents,  // ADD THIS
    attendeeCount: sql<number>`COALESCE(COUNT(${eventAttendees.id}), 0)`,
  })
```

---

#### B003: Add priceInCents to POST /events Insert

**File**: `server/src/routes/api/events.ts`
**Location**: Lines 409-432

**Change**: Add `priceInCents` to both `.values()` and `.returning()`

```typescript
const [event] = await tx
  .insert(events)
  .values({
    title: payload.title,
    eventDescription: normalizeDescription(payload.description),
    date: new Date(payload.date),
    location: payload.location ?? null,
    meetingLink: payload.meetingLink ?? null,
    maxAttendees: payload.maxAttendees === undefined ? null : payload.maxAttendees,
    imageUrl: payload.imageUrl ?? null,
    tags: payload.tags ?? [],
    eventType: payload.eventType,
    priceInCents: payload.priceInCents ?? null,  // ADD THIS
    guestExperts: [],
  })
  .returning({
    id: events.id,
    title: events.title,
    eventDescription: events.eventDescription,
    date: events.date,
    location: events.location,
    maxAttendees: events.maxAttendees,
    meetingLink: events.meetingLink,
    imageUrl: events.imageUrl,
    tags: events.tags,
    eventType: events.eventType,
    priceInCents: events.priceInCents,  // ADD THIS
  });
```

---

#### B004: Add priceInCents to PUT /events/:id Update

**File**: `server/src/routes/api/events.ts`
**Location**: Lines 471-537

**Change 1**: Add priceInCents to updateValues (after line 484)

```typescript
if (updates.eventType !== undefined) updateValues.eventType = updates.eventType;
if (updates.priceInCents !== undefined) updateValues.priceInCents = updates.priceInCents;  // ADD THIS
```

**Change 2**: Add priceInCents to returning clause (around line 536)

```typescript
.returning({
  id: events.id,
  title: events.title,
  eventDescription: events.eventDescription,
  date: events.date,
  location: events.location,
  maxAttendees: events.maxAttendees,
  meetingLink: events.meetingLink,
  imageUrl: events.imageUrl,
  tags: events.tags,
  eventType: events.eventType,
  priceInCents: events.priceInCents,  // ADD THIS
});
```

---

### Frontend Tasks

#### F001: Add Subscribe CTA Button to Header Navigation

**File**: `src/shared/components/layout/Header.tsx`

**Requirements**:
- Add "Subscribe" button beside "Join Community" button
- Only visible to authenticated users WITHOUT active subscription
- Use `useCurrentSubscription()` hook to check subscription status

**Implementation**:
1. Import `useCurrentSubscription` hook
2. Add subscription check logic
3. Conditionally render Subscribe button

```tsx
// Near the "Join Community" button area
{user && !hasActiveSubscription && (
  <Button variant="outline" asChild>
    <Link to="/subscribe">Subscribe</Link>
  </Button>
)}
```

---

#### F002: Add Subscribe Link to User Dropdown

**File**: `src/shared/components/layout/UserProfileDropdown.tsx`

**Requirements**:
- Add "Subscribe" menu item after "Content Library"
- Only show for users without active subscription
- Show "Manage Subscription" for subscribed users

**Implementation**:
Add new DropdownMenuItem with conditional text based on subscription status.

---

#### F003: Add Subscribe Link to Sidebar Menu

**File**: `src/shared/components/layout/AppLayout.tsx`

**Requirements**:
- Add to `memberMenuItems` array (lines 39-65)
- Conditional visibility based on subscription status

---

#### F004: Redesign Subscribe Page (Deferred - Phase 2)

**File**: `src/pages/Subscribe.tsx`

**Note**: The current Subscribe page is functional. The redesign with hero section, testimonials, and premium content sections can be done as a separate enhancement after the critical bugs are fixed.

---

## Files to Modify

| Task ID | File | Changes |
|---------|------|---------|
| B001 | `server/src/routes/api/events.ts` | Add priceInCents to GET /:id select |
| B002 | `server/src/routes/api/events.ts` | Add priceInCents to GET list select |
| B003 | `server/src/routes/api/events.ts` | Add priceInCents to POST insert + returning |
| B004 | `server/src/routes/api/events.ts` | Add priceInCents to PUT update + returning |
| F001 | `src/shared/components/layout/Header.tsx` | Add Subscribe CTA button |
| F002 | `src/shared/components/layout/UserProfileDropdown.tsx` | Add Subscribe menu item |
| F003 | `src/shared/components/layout/AppLayout.tsx` | Add Subscribe to sidebar |

---

## Implementation Order

**Phase 1 - Critical Bug Fix (Backend)**
1. B003 - POST /events insert (fix data saving)
2. B004 - PUT /events update (fix data updates)
3. B001 - GET /events/:id (fix data retrieval)
4. B002 - GET /events list (fix list display)

**Phase 2 - Navigation (Frontend)**
5. F001 - Header Subscribe button
6. F002 - User dropdown link
7. F003 - Sidebar link

---

## Testing Checklist

### Price Bug Fix
- [ ] Create new event with price > 0 (e.g., 100 EGP)
- [ ] Verify price is saved to database (`SELECT price_in_cents FROM events WHERE id = ...`)
- [ ] View event detail page as guest - price badge should show
- [ ] View event detail page as logged-in user - price badge should show
- [ ] Edit event - price field should be pre-filled with correct value
- [ ] Update event price - changes should persist on save
- [ ] Event list should return priceInCents in API response

### Subscribe Navigation
- [ ] Subscribe button visible in nav for authenticated non-subscribed users
- [ ] Subscribe button NOT visible for guests (not logged in)
- [ ] Subscribe button NOT visible for users with active subscription
- [ ] Click Subscribe navigates to `/subscribe` page
- [ ] Subscribe link in user dropdown works
- [ ] Subscribe link in sidebar works

---

## Risk Assessment

- **Low Risk (B001-B004)**: Additive changes to API, no breaking changes
- **Low Risk (F001-F003)**: Simple navigation additions
- **Data Migration**: Not needed - column already exists in DB
- **Breaking Changes**: None anticipated

---

## Verification Query

After implementing B003, verify price is being saved:

```sql
-- Check if price was saved
SELECT id, title, price_in_cents FROM events ORDER BY created_at DESC LIMIT 5;
```

---

## Second-Order Considerations

1. **Existing events without prices**: Events created before fix will have `price_in_cents = NULL`. This is correct behavior (free events).

2. **Frontend mapper already handles conversion**: `src/app/api/events.ts:74` already maps `priceInCents` (camelCase) to `price_in_cents` (snake_case). No frontend type changes needed.

3. **Payment flow integration**: The `PriceDisplayCard` and payment checkout dialog already consume `price_in_cents` correctly. Once backend returns the data, everything will work.

4. **Subscription check performance**: The `useCurrentSubscription()` hook has a 60-second stale time cache, so it won't cause excessive API calls in navigation.
