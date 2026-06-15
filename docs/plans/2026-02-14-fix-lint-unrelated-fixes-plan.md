---
title: "fix: Cairo timezone, card badge positioning, mandatory phone, small polish"
type: fix
status: completed
date: 2026-02-14
branch: lint-unrelated-fixes
---

# Fix: Cairo Timezone, Card Badge Positioning, Mandatory Phone & Small Polish

## Overview

Four small-but-impactful fixes for the `lint-unrelated-fixes` branch. Each is scoped to minimize blast radius while being production-grade for 10K+ users.

## Fix 1: Force Cairo Timezone for All Event Dates

### Problem

All date formatting uses the browser's local timezone (`date-fns format()`, `toLocaleDateString()`, `toLocaleTimeString()`, `Intl.DateTimeFormat`). If an admin creates an event at 8 PM Cairo but their browser reports a different offset (VPN, travel, device misconfiguration), the stored and displayed time will be wrong. Display for members also varies by browser timezone.

### Root Cause

- `date-fns format()` has **no timezone parameter** — it always uses browser-local time
- `EventCard.tsx:30-38` uses `toLocaleDateString`/`toLocaleTimeString` without `timeZone`
- `EventDetail.tsx:42-55` uses `date-fns format()` — no timezone control
- `AdminEventForm.tsx:230` interprets `datetime-local` via browser timezone on submit
- `dateUtils.ts` — all 4 helpers use `date-fns format()` without timezone

### Solution (Zero New Dependencies — Centralized in dateUtils.ts)

Egypt abolished DST in 2014. Use the native `Intl.DateTimeFormat` API with `timeZone: 'Africa/Cairo'` everywhere instead of `date-fns format()`. **All formatting is centralized in `dateUtils.ts`** — consumer files import functions, never hardcode `'Africa/Cairo'`.

> **Reviewer feedback applied:** Kieran flagged `+02:00` hardcoding risk. Simplicity reviewer flagged DRY violation of scattering `'Africa/Cairo'` across 9 files. Both addressed below.

**Step 1: Update `src/shared/utils/dateUtils.ts`** — Single source of truth for all Cairo formatting:

```typescript
// src/shared/utils/dateUtils.ts
export const CAIRO_TZ = 'Africa/Cairo';

export const formatMeetupDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const datePart = new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, month: 'long', day: 'numeric', year: 'numeric',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(date);
    return `${datePart} · ${timePart}`;
  } catch { return dateString; }
};

export const formatLongDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date(dateString));
  } catch { return dateString; }
};

export const formatShortDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(dateString));
  } catch { return dateString; }
};

// Card-friendly: "Feb 14" (no year)
export const formatCardDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, month: 'short', day: 'numeric',
    }).format(new Date(dateString));
  } catch { return dateString; }
};

export const formatTime = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(new Date(dateString));
  } catch { return dateString; }
};

export const formatDateWithDay = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date(dateString));
  } catch { return dateString; }
};

// Helpers for Cairo-aware datetime-local input (admin form)
export function toCairoDatetimeLocal(input: string | Date | undefined): string {
  const date = input ? new Date(input) : new Date(Date.now() + 86_400_000);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// Compute current Cairo UTC offset dynamically (handles hypothetical future DST)
export function getCairoOffsetString(): string {
  const now = new Date();
  const cairoStr = now.toLocaleString('en-US', { timeZone: CAIRO_TZ });
  const cairoTime = new Date(cairoStr);
  const offsetMinutes = Math.round((cairoTime.getTime() - now.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absH = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const absM = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  return `${sign}${absH}:${absM}`;
}

export const isUpcoming = (dateString: string): boolean => { /* unchanged — UTC comparison */ };
export const isPast = (dateString: string): boolean => { /* unchanged — UTC comparison */ };
```

**Step 2: Update consumer files** — Import from `dateUtils`, no inline formatting:

| File | Change |
|------|--------|
| `EventCard.tsx:27-41` | Import `formatCardDate`, `formatTime` from dateUtils |
| `EventDetail.tsx:42-55` | Import `formatLongDate`, `formatTime` from dateUtils. Remove inline `formatEventDate`/`formatEventTime` |
| `ThankYouEvent.tsx:56,64,72` | Import `formatDateWithDay`, `formatTime`, `formatShortDate` from dateUtils |
| `ThankYouTrack.tsx:53,61,69,299` | Same as ThankYouEvent |
| `AdminEventDetail.tsx:85,97` | Import `formatLongDate`, `formatTime` from dateUtils |
| `AdminTrackDetail.tsx:22` | Import `formatShortDate`, `formatTime` from dateUtils |
| `PublicTrackCard.tsx:20` | Import `formatShortDate` from dateUtils |

**Step 3: Update `AdminEventForm.tsx`** — Two changes:

a) `toDateTimeLocalString` (line 114-118): Import `toCairoDatetimeLocal` from dateUtils

b) `handleSubmit` (line 230): Use dynamic offset instead of hardcoded `+02:00`:

```typescript
import { getCairoOffsetString } from '@/shared/utils/dateUtils';
// ...
date: new Date(formValues.date + getCairoOffsetString()).toISOString(),
```

c) `formatPreviewDate` (line 133-141): Use dateUtils:

```typescript
import { CAIRO_TZ } from '@/shared/utils/dateUtils';
// ...
function formatPreviewDate(iso: string | undefined) {
  if (!iso) return 'TBC';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: CAIRO_TZ,
  }).format(date);
}
```

### Files Changed

- `src/shared/utils/dateUtils.ts` — **Core change**: all formatters + Cairo helpers (single source of truth)
- `src/features/events/components/EventCard.tsx` — Import dateUtils
- `src/features/events/pages/EventDetail.tsx` — Import dateUtils, remove inline formatters
- `src/features/events/components/AdminEventForm.tsx` — Import dateUtils helpers for form
- `src/pages/ThankYouEvent.tsx` — Import dateUtils
- `src/pages/ThankYouTrack.tsx` — Import dateUtils
- `src/features/events/pages/AdminEventDetail.tsx` — Import dateUtils
- `src/features/tracks/pages/AdminTrackDetail.tsx` — Import dateUtils
- `src/features/tracks/components/PublicTrackCard.tsx` — Import dateUtils

### Risk Assessment

- **Low risk**: All changes are display-side formatting or input interpretation
- **No DB migration**: Dates stay stored as UTC with timezone in PostgreSQL
- **Backward compatible**: Existing stored dates are UTC and will display correctly in Cairo

---

## Fix 2: Move Card Badges Below Image (Not Overlaying Faces)

### Problem

"Upcoming"/"Event"/"Track" badges are positioned `absolute top-3 left-3` overlaying the card image, which hides the faces of guest speakers and experts (visible in the screenshots).

### Current Behavior (3 card components)

1. **EventCard.tsx:80-92** — Badge container is inside the image `<div className="relative">` with `absolute top-3 left-3`
2. **PublicTrackCard.tsx:57-64** — Same pattern with "Track" + "Sessions" badges
3. **TrackCard.tsx:82-96** (Admin) — Same pattern with "Track" + "Draft" badges

### Desired Behavior (from EventDetail.tsx:354-362)

Badges rendered as **inline elements inside the card body**, below the image — not overlaid on it.

### Solution

Move the badge container from inside the image relative wrapper to inside the `p-5` card body content area, as the first element before the title.

**EventCard.tsx** — Move lines 80-92 to after line 103 (start of `<div className="p-5">`):

```tsx
<div className="p-5">
  {/* Badges - moved from image overlay to card body */}
  <div className="mb-3 inline-flex flex-wrap items-center gap-1">
    <span className="rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-2 py-0.5 text-[10px] font-semibold text-[#101010]">
      {isUpcoming ? 'Upcoming' : 'Past'}
    </span>
    <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
      {event.event_type}
    </span>
    {primaryTag && (
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
        {primaryTag}
      </span>
    )}
  </div>
  <div className="flex items-start justify-between gap-4">
    ...
```

**PublicTrackCard.tsx** — Move lines 57-64 to inside the `<div className="p-5">`:

```tsx
<div className="p-5">
  <div className="mb-3 inline-flex flex-wrap items-center gap-1">
    <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2 py-0.5 text-[10px] font-semibold text-white">
      Track
    </span>
    <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
      {track.event_count} {track.event_count === 1 ? 'Session' : 'Sessions'}
    </span>
  </div>
  ...
```

**TrackCard.tsx (Admin)** — Move lines 82-96 to inside the card content, after the image section:

```tsx
<div className="flex flex-1 flex-col">
  <div className="px-6 pt-4 inline-flex flex-wrap items-center gap-1">
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/90 text-white">
      <FolderOpen className="h-3 w-3" />
      Track
    </span>
    {!track.is_published && (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/90 text-white">
        Draft
      </span>
    )}
  </div>
  <CardHeader>...
```

### Files Changed

- `src/features/events/components/EventCard.tsx`
- `src/features/tracks/components/PublicTrackCard.tsx`
- `src/features/tracks/components/TrackCard.tsx`

### Risk Assessment

- **Low risk**: Pure layout/CSS change, no data or logic changes
- **Visual only**: Badges move below image, clearing the speaker faces
- **Consistent**: Matches the EventDetail.tsx pattern already live

---

## Fix 3: Mandatory Phone Number + Completion Banner

### Current State Assessment

| Area | Status | Details |
|------|--------|---------|
| Signup Step 3 | **Already required** | Validates non-empty, min 7 digits, E.164 format |
| Backend update API | Optional | `users.ts:15` — `phoneNumber: z.string().max(30).optional()` |
| Dashboard phone field | No validation | Plain input, no required indicator |
| DB schema | Nullable | `phone_number: text('phone_number')` |

**Conclusion:** Phone is already enforced during new signup (Step 3 won't let you proceed without it). The gap is **existing users who signed up before this enforcement** — they may have no phone number.

### Solution: Profile Completion Banner

Add a sticky banner inside the member dashboard (AppLayout variant="member") that shows when `phone_number` is missing. Once the user adds their phone and saves, the banner disappears.

**Step 1: Create `src/shared/components/PhoneCompletionBanner.tsx`**

```tsx
// src/shared/components/PhoneCompletionBanner.tsx
import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { Button } from '@/shared/components/ui/button';

export function PhoneCompletionBanner() {
  const { data: profile, isLoading } = useCurrentUser();

  // Don't show while loading or if phone exists
  if (isLoading || profile?.profile?.phone_number) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Phone className="h-4 w-4 shrink-0" />
          <span>
            <strong>Complete your profile</strong> — Add your WhatsApp number to receive
            event reminders and Zoom links.
          </span>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
        >
          <Link to="/dashboard/profile">Add Number</Link>
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Add banner to `src/shared/components/layout/AppLayout.tsx`**

Insert inside the member variant `<main>` section, before `{children}`:

```tsx
// In AppLayout, inside the <main> element (line 331)
import { PhoneCompletionBanner } from '@/shared/components/PhoneCompletionBanner';

// ...
<main className="relative flex-1 overflow-x-hidden overflow-y-auto">
  {variant === 'member' && <PhoneCompletionBanner />}
  {/* existing gradient backgrounds */}
  <div className="pointer-events-none absolute ..." />
  <div className="pointer-events-none absolute ..." />
  <div className="relative p-6">{children}</div>
</main>
```

### Why Not Make Backend Phone Mandatory?

Making the backend reject empty phone would break profile saves for existing users who haven't added a phone yet (they couldn't save ANY profile change). The gentle banner approach is safer — it nudges without blocking.

### Files Changed

- `src/shared/components/PhoneCompletionBanner.tsx` (NEW — ~25 lines)
- `src/shared/components/layout/AppLayout.tsx` (2-line addition)

### Risk Assessment

- **Very low risk**: Additive only, no breaking changes
- **Performance**: `useCurrentUser()` is already cached by TanStack Query — the banner reuses existing data
- **UX**: Banner is visible but non-blocking; disappears after phone is added
- **10K users**: No extra API calls — piggybacks on existing profile query

---

## Fix 4: Small Polish Items

### 4a. Clean Up EventCard Duration Type Cast

**File:** `src/features/events/components/EventCard.tsx:132`

**Current:**
```tsx
{(event as { duration?: string }).duration ?? '90 min'}
```

**Fix:** The `duration` field isn't in the `Event` type, so this cast always falls through to `'90 min'`. Replace with just the fallback:

```tsx
{'90 min'}
```

Or better — if events actually have a `duration` field in the API response, add it to the `Event` type. Need to check the API response to confirm. If not present, simplify to the literal.

### 4b. Remove `date-fns` Import from Updated Files

After switching to `Intl.DateTimeFormat` in Fix 1, remove unused `import { format } from 'date-fns'` from:
- `src/shared/utils/dateUtils.ts`
- `src/features/events/pages/EventDetail.tsx`
- `src/pages/ThankYouEvent.tsx`
- `src/pages/ThankYouTrack.tsx`
- `src/features/events/pages/AdminEventDetail.tsx`
- `src/features/tracks/pages/AdminTrackDetail.tsx`
- `src/features/tracks/components/PublicTrackCard.tsx`

This keeps imports clean and avoids the lint rule about unused imports.

---

## Acceptance Criteria

- [ ] **Timezone**: All event dates display in Cairo time regardless of browser timezone
- [ ] **Timezone**: Admin form defaults and previews show Cairo time
- [ ] **Timezone**: Event creation at "8 PM" in admin form stores correctly as 6 PM UTC
- [ ] **Badges**: "Upcoming"/"Event"/"Track" badges appear below the card image, not overlaying it
- [ ] **Badges**: Badge styling matches existing EventDetail page pattern
- [ ] **Phone banner**: Banner shows for members without phone number on all dashboard pages
- [ ] **Phone banner**: Banner disappears after user adds phone number
- [ ] **Phone banner**: Banner does NOT show on admin dashboard variant
- [ ] **Polish**: No unused imports remain from date-fns replacements
- [ ] **Lint**: `npm run lint` passes
- [ ] **Build**: `npm run build` succeeds
- [ ] **Tests**: `npm run test:unit` passes

## Implementation Order

1. **Fix 1 (Timezone)** — Foundational; touches `dateUtils.ts` that other files import
2. **Fix 2 (Badges)** — Independent; pure layout
3. **Fix 3 (Phone banner)** — Independent; additive only
4. **Fix 4 (Polish)** — Cleanup after Fix 1

## Dependencies & Risks

- **No new npm packages** — Uses native `Intl.DateTimeFormat` API (supported in all modern browsers)
- **No DB migration** — Dates remain stored as UTC in PostgreSQL
- **No backend changes** — All fixes are frontend-only
- **Egypt DST**: Egypt has not observed DST since 2014. Both display (`timeZone: 'Africa/Cairo'`) and form submission (`getCairoOffsetString()`) dynamically use the browser's IANA timezone database, so any future DST change is handled automatically.

## Edge Cases Addressed (from SpecFlow Analysis)

### Timezone Edge Cases

1. **Midnight boundary dates**: If admin creates event at 11 PM or 12 AM Cairo, the UTC date might cross day boundaries. The `Intl.DateTimeFormat` with `timeZone: 'Africa/Cairo'` handles this correctly — it always shows the Cairo-local day.

2. **Form submit offset safety**: `getCairoOffsetString()` dynamically computes Cairo's UTC offset from the browser's IANA database. This handles any future DST changes automatically. The `datetime-local` input spec guarantees the value is timezone-naive (format: `YYYY-MM-DDTHH:mm`).

3. **`isUpcoming` logic**: Stays as UTC comparison (`new Date(dateString) > new Date()`). This is timezone-agnostic and correct — an event in the future is "upcoming" regardless of display timezone. No change needed.

4. **Admin editing existing events**: When editing, `toDateTimeLocalString` reads the stored UTC date and converts to Cairo time for the form. If an event was accidentally created in wrong timezone, the admin will see the "Cairo interpretation" and can correct it. This is the safest default.

5. **Locale fallback for `formatToParts`**: The `sv-SE` locale is used because it outputs ISO-compatible date format. All modern browsers support this. Added `?? ''` null-safe fallback on each `.find()` call.

### Phone Banner Edge Cases

1. **No extra API calls**: `useCurrentUser()` data is already fetched and cached by TanStack Query (5-min staleTime). The banner component reuses this cached data — zero additional network requests.

2. **Cache invalidation after phone save**: When user saves phone via `useUpdateCurrentUser()`, it calls `queryClient.invalidateQueries()` which refetches the profile. Banner disappears on next render cycle.

3. **New users (signed up after Step 3 enforcement)**: They always have a phone number, so banner never shows.

4. **Admin users**: Banner only shows in `variant === 'member'`. Admin dashboard doesn't show it. If admin user visits member dashboard, they'll see it if phone is missing.

5. **Banner persistence**: No dismiss button for MVP. Users who don't add phone see it every visit. This is intentional — phone is required for WhatsApp communication. Can add localStorage dismiss in a future iteration if needed.

### Badge Edge Cases

1. **Mobile wrapping**: Badges use `flex-wrap` so they wrap gracefully on narrow screens. Max 3 badges per card (status + type + optional tag).

2. **Removed `absolute` positioning**: No more z-index conflicts with the favorite button — both now live in separate DOM areas.

3. **Favorite button stays on image**: Only badges move. The heart/favorite button (`absolute top-3 right-3`) stays on the image overlay since it doesn't obscure faces.

### What We Explicitly Chose NOT to Do (YAGNI)

- No i18n for banner text (app is English-only for MVP)
- No banner dismiss/localStorage (phone is genuinely required)
- No backend phone validation change (would break existing users)
- No `date-fns-tz` package install (native Intl API is sufficient)
- No badge ARIA labels (screen readers read text content naturally)
- No CLS transition animation for banner (appears once per page load, minimal shift)
