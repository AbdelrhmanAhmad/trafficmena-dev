# CSRF Protection

We enforce a double-submit CSRF token for all state-changing API requests.

- Server sets a `tm_csrf` cookie (SameSite=Strict, Secure in production) on safe requests.
- Client includes `x-csrf-token` header on non-GET/HEAD/OPTIONS requests.
- Requests must present matching cookie + header and a trusted Origin/Referer.
- Exempted paths: `/api/payments/webhook` and `/api/payments/webhook_json` (HMAC-verified).

Frontend calls that use `fetchJson()` automatically attach the CSRF header when a token is present.
