---
title: Thank You Page Pattern for Bookings
category: feature-implementations
tags: [payment, booking, ux, thank-you-page, calendar]
severity: low
components: [pages, payment, events, tracks]
symptoms:
  - After payment, users need confirmation of what they purchased
  - Users need easy way to add sessions to calendar
  - Payment success page was generic
root_cause: New UX requirement for post-purchase confirmation
resolution_date: 2026-02-02
---

# Thank You Page Pattern for Bookings

## Problem

After completing a booking or payment, users were redirected to a generic success page. They needed:
1. Confirmation of exactly what they purchased
2. Easy access to add sessions to their calendar
3. Clear next steps

## Solution

### Thank You Page Structure

Created `src/pages/ThankYouTrack.tsx` as the pattern:

```tsx
export default function ThankYouTrack() {
  const { id } = useParams<{ id: string }>();
  const { data: track } = useTrackById(id);
  const { data: booking } = useTrackBooking(id);

  return (
    <div className="container max-w-2xl py-8">
      {/* Success Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Booking Confirmed!</CardTitle>
          <CardDescription>
            You're registered for {track.title}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* What's Included */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {track.events.map(event => (
              <li key={event.id} className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{event.title}</span>
                <span className="text-muted-foreground">
                  {formatDate(event.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add to Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild variant="outline">
            <a href={googleCalendarUrl} target="_blank">
              Google Calendar
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={icsDownloadUrl} download>
              Download .ics
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      {booking.pricePaid > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span>{formatCurrency(booking.pricePaid)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Add sessions to your calendar</li>
            <li>Check your email for confirmation</li>
            <li>Join via the meeting link on event day</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Calendar URL Generation

Google Calendar URL:
```typescript
function generateGoogleCalendarUrl(event: Event): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatISODate(event.startsAt)}/${formatISODate(event.endsAt)}`,
    details: event.summary || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
```

ICS file generation:
```typescript
function generateICS(events: Event[]): string {
  const icsEvents = events.map(event => `
BEGIN:VEVENT
DTSTART:${formatICSDate(event.startsAt)}
DTEND:${formatICSDate(event.endsAt)}
SUMMARY:${event.title}
DESCRIPTION:${event.summary || ''}
LOCATION:${event.location || ''}
END:VEVENT
  `).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TrafficMENA//EN
${icsEvents}
END:VCALENDAR`;
}
```

### Routing

Add route in `App.tsx`:
```tsx
<Route path="/thank-you-track/:id" element={<ThankYouTrack />} />
```

Redirect from payment success:
```tsx
// In payment success handler
if (metadata.type === 'track') {
  navigate(`/thank-you-track/${metadata.trackId}`);
} else if (metadata.type === 'event') {
  navigate(`/thank-you-event/${metadata.eventId}`);
}
```

## Files Changed

- `src/pages/ThankYouTrack.tsx` - New page component
- `src/pages/ThankYouEvent.tsx` - Updated existing page
- `src/App.tsx` - Added route
- `src/pages/payment/success.tsx` - Smart redirect logic

## Key Components

1. **Success confirmation** - Green checkmark, clear title
2. **What's included** - List of sessions/events
3. **Calendar integration** - Google Calendar link + ICS download
4. **Payment summary** - Amount paid (if applicable)
5. **Next steps** - Clear action items

## Prevention

When adding new booking types:
1. Create dedicated thank-you page following this pattern
2. Include calendar integration
3. Show what's included in the purchase
4. Add clear next steps
5. Update payment success redirect logic
