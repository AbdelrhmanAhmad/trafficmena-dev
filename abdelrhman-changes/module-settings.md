# Module Settings — enable / disable Masterclasses & Digital Products

## Overview

Admins can turn **Masterclasses** and **Digital Products** on or off site-wide from a dedicated **Module Settings** page.

When a module is **disabled**:

- Hidden from the **public header** (Digital Products)
- Hidden from the **member sidebar**
- Hidden from the **admin sidebar** (module itself is disabled for admins too)
- Deep links show an **unavailable** screen via `ModuleGate`

When **enabled** (default): previous behaviour.

## Admin UI

| Path | Access |
|------|--------|
| `/admin/settings/modules` | Owner / Admin |

Sidebar: **Module Settings** (under General Settings).

Switches:

1. **Masterclasses** — `masterclassesEnabled`
2. **Digital Products** — `digitalProductsEnabled`

## Database

Migration: `server/drizzle/0024_module_settings.sql`

```sql
ALTER TABLE platform_settings
  ADD COLUMN masterclasses_enabled boolean DEFAULT true NOT NULL,
  ADD COLUMN digital_products_enabled boolean DEFAULT true NOT NULL;
```

Run:

```bash
npm --prefix server run db:migrate
```

## API

| Endpoint | Change |
|----------|--------|
| `GET /api/settings/public` | Returns `masterclassesEnabled`, `digitalProductsEnabled` (default `true`); `Cache-Control: no-store` |
| `GET /api/admin/settings/general` | Same fields |
| `PATCH /api/admin/settings/general` | Accepts optional `masterclassesEnabled`, `digitalProductsEnabled` |

## Frontend gating

| Surface | Behaviour when off |
|---------|-------------------|
| `Header.tsx` | Removes Digital Products nav item |
| `AppLayout` member/admin menus | Filters Masterclasses / Digital Products items via `useModuleFlags()` |
| Routes (public / member / admin) | Wrapped in `ModuleGate` |

Key files:

- `src/pages/admin/module-settings.tsx`
- `src/pages/admin/components/ModuleSettingsCard.tsx`
- `src/shared/components/ModuleGate.tsx`
- `src/app/hooks/useSettings.ts` — `usePublicSettings()`, `useModuleFlags()`, optimistic public-cache update on toggle

## Cache / sync fix (member nav)

Browser was caching `GET /settings/public` (`max-age=30`), so the **member** sidebar could keep showing modules after disable while **admin** already hid them (React Query updated locally).

Fix:

1. Public settings response uses `Cache-Control: no-store`
2. Toggle optimistically updates **both** admin + public React Query caches
3. `refetchOnMount: 'always'` on public settings
4. While public settings are loading with no cache, module nav items stay hidden (avoid flash)

## Notes

- Defaults are **on** so existing deployments stay visible after migrate.
- Settings page itself stays reachable so admins can re-enable modules.
- Cart / orders history remain available; storefront entry points are hidden when Digital Products is off.
