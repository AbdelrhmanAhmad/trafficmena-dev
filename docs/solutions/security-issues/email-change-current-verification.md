# Email change — current-email verification

Self-service email change requires two OTP steps:

1. **Current email** — proves the authenticated session holder controls the mailbox being replaced.
2. **New email** — proves control of the destination address before the account email is updated.

The notice email to the old address on step 1 is informational only and is **not** authorization.

## API

| Step | Endpoint | Body |
|------|----------|------|
| Start / resend current | `POST /api/auth/email-change/request` | `{ newEmail }` |
| Verify current | `POST /api/auth/email-change/verify-current` | `{ newEmail, otp }` |
| Verify new + commit | `POST /api/auth/email-change/verify` | `{ newEmail, otp }` |

Resend while on the new-email step reuses `request` when `current_email_verified_at` is already set (returns `phase: new_email`).

## Migration

Apply `0033_email_change_current_verification.sql` on each environment before deploying this behavior.

## Security properties preserved

- HMAC-hashed OTPs (never stored plaintext)
- Constant-time compare
- Single-use request consumption (compare-and-swap on verify)
- Session invalidation for other devices on success
- Rate limits on request and verify
