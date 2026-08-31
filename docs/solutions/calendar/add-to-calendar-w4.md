---
module: calendar
tags: [phase2, w4, events, tracks, timezone, privacy]
problem_type: feature
---

# Add to Calendar (W4)

## Summary
Registered event attendees and track bookers can add sessions to Google Calendar or download `.ics` files. All calendar content is generated server-side from a canonical helper so event detail, thank-you pages, and confirmation emails stay consistent.

## Behavior

### Event
- **Online:** `LOCATION` and description point to `/meetups/:id` — never the raw `meetingLink`.
- **Offline:** physical `location` (or `locationUrl` fallback label).
- **Duration:** 2-hour default from start (`DEFAULT_EVENT_DURATION_MS`) because schema stores start only.

### Track
- One `.ics` with all **published** sessions (`sortOrder`).
- UI lists per-session Google Calendar links plus one combined ICS download.

### Timezone
- IANA `Africa/Cairo` in ICS via `DTSTART;TZID=Africa/Cairo:…`
- Google Calendar uses UTC instant in `dates=` (portable, DST-safe).

### Authorization
- `GET /api/events/:id/calendar*` — active registration (or staff).
- `GET /api/tracks/:id/calendar*` — active track booking (or staff).

### Email
- Sent after free/paid registration fulfillment.
- Includes Google Calendar button + `.ics` attachment.

## Key files
- `server/src/services/eventCalendar.ts`
- `server/src/services/eventCalendarAccess.ts`
- `server/src/routes/api/calendar.ts`
- `server/src/services/registrationConfirmationEmail.ts`
- `src/shared/components/calendar/EventCalendarActions.tsx`

## Not in scope
Live sync, OAuth, Outlook API, calendar feeds.
