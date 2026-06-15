# RBAC Role Names Decision – Canonical Role Is `user`

**Date:** 2025-11-01  
**Decision:** Make `user` the canonical free-tier role and remove `member` from the enum

---

## Context

During RBAC implementation we briefly considered renaming the free tier role from `user` to `member`. That renaming leaked into a migration, the enum default, and several SPA helpers. The admin dashboard never gained role-management controls, so the UI silently displayed "Member" badges while the database stored `member`. This mismatch created confusion for operators and future contributors.

## Analysis

**Current Role Structure:**
- `owner` – Full system control
- `admin` – Full control except removing owners
- `manager` – Create/update events & library (no delete), manage invitations, view-only user directory
- `expert` – Co-host/author content only
- `user` – View-only access to events and library (MVP free tier)

**Future Planning:**
- `member` – Marketing-friendly label for the free tier, but not stored in the database
- `premium_user` – Future paid tier (placeholder)
- `vip_user` – Future top tier (placeholder)

## Why Lock On `user`

1. **Canonical data** – Only a single string represents the free tier across the database, API, and SPA. We render "Member" in copy, but store `user` so the code stays unambiguous.
2. **Compat shim** – We normalize any lingering `member` values to `user` at the API boundary until all legacy data is migrated.
3. **Future tiers** – When paid tiers arrive we append new enum values without revisiting the base role name.

## Implementation Details

The RBAC middleware enforces permissions based on role names, not semantics:

```typescript
// Permission Matrix
const permissions = {
  user: ['read:events', 'read:library'],
  manager: ['read:events', 'read:library', 'create:events', 'create:library', 'update:events', 'update:library'],
  admin: ['*'], // Full access
  owner: ['*'], // Full access plus user management
  expert: ['read:events', 'read:library', 'create:content']
};
```

## Future Considerations

When implementing paid subscriptions:
1. Marketing copy can continue to say “members”. The stored value stays `user`.
2. When paid subscriptions ship, introduce new enum values (`premium_user`, etc.) rather than renaming `user` again.
3. Drop the temporary `member` normalization once telemetry shows no legacy rows remain.

This decision aligns with MVP values: ship fast, stay simple, validate before building complexity.
