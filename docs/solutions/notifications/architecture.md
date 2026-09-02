# Notification System (W11A)

## Architecture

Business modules call `notifyBusinessEvent` (or announcement campaign APIs). The notification service creates per-recipient **email** and **whatsapp** delivery rows, then a DB-backed worker sends them asynchronously.

```
Business Event → Notification Service → Deliveries (outbox)
                                      ├─ Email → ResendEmailProvider → Resend
                                      └─ WhatsApp → WhatsAppProvider
                                                    └─ UnconfiguredWhatsAppProvider (W11A)
```

## WhatsApp status

**NOT CONFIGURED.** Valid phones produce delivery status `skipped` with reason `provider_not_configured`. No WhatsApp env vars. No external WhatsApp HTTP. Future: implement `WhatsAppProvider` (e.g. Meta) and swap in `getWhatsAppProvider()`.

## Auth emails

OTP and email-change OTP remain on the Better Auth / emailChange path and are **not** routed through this system.

## Wired business triggers (W11A)

| Trigger | Source |
|---------|--------|
| `certificate_issued` | `services/certificates.ts` after new cert insert |
| `event_registration` / `track_registration` | `registrationConfirmationEmail.ts` (ICS via payload attachments) |
| `payment_success` / `payment_failed` / `payment_pending` | `routes/api/payments.ts` |
| `access_granted` | track/masterclass manual enroll; masterclass + digital product purchase |
| `event_rescheduled` | `events.ts` PUT when `date` changes |
| `event_cancelled` / `refund_status_update` | cancel + refund approve/reject |

Deferred: `event_reminder`, Geidea-specific, `recording_added`, OTP.

## W10

Hub feed announcements (`activity_announcements`) stay feed-only. Outbound blasts use `notification_campaigns` with optional `activity_announcement_id` link.

## Admin

- `/admin/notifications/templates`
- `/admin/notifications/deliveries` (view/filter/retry; no delete)
- `/admin/notifications/announcements`
