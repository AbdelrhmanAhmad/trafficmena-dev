---
module: platform-settings
tags: [phase2, w3, feature-toggles, product-visibility]
problem_type: architecture
---

# Phase 2 W3 Product Visibility Toggles

## Summary
Customer-facing availability for Subscriptions, Digital Products, and Masterclasses is enforced server-side via `platform_settings` and `server/src/services/productVisibility.ts`.

## Behavior
- **Digital Products / Masterclasses:** hidden by default; admin can toggle before first publish; first published item sets a permanent launch lock and forces the section visible.
- **Subscriptions:** toggle blocks new checkout/marketing; active subscribers retain entitlements.
- **Admin CRUD** for hidden modules remains available; member/public discovery and new purchases are blocked.

## API
- Public flags: `GET /api/settings/public`
- Admin update: `PATCH /api/admin/settings/general` (admin+)

## Migration
`server/drizzle/0034_product_visibility.sql` — not applied in this workstream step.

## Error codes
- `FEATURE_DISABLED` — checkout/discovery blocked
- `FEATURE_CANNOT_BE_DISABLED_AFTER_PUBLISH` — launch lock
