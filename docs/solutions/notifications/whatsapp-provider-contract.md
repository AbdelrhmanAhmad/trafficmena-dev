# Future WhatsApp Provider Contract

## Current (W11A)

`UnconfiguredWhatsAppProvider`:

- `send()` → `{ status: 'skipped', reason: 'provider_not_configured' }`
- No env vars, no HTTP

## Future (W11B — after owner approval)

1. Implement `WhatsAppProvider.send` against approved vendor (Meta Cloud API / other).
2. Register in `getWhatsAppProvider()` when credentials present.
3. Delivery worker already treats `sent` / `failed` / `skipped`.
4. Store `provider_message_id` for callbacks.
5. Retry previously skipped `provider_not_configured` rows after go-live.

Do not scatter provider calls into Events/Tracks/Payments modules.
