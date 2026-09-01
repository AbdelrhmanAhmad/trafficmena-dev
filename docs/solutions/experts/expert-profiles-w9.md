# Expert Profiles (W9)

Independent expert entity with bilingual content, admin lifecycle, optional user assignment, and legacy `guest_experts` backfill.

See `abdelrhman-changes-local/phase2-expert-profiles/` for full audit and migration plan.

## Migrations

- `0037_expert_profiles.sql` — tables
- `0038_expert_guest_experts_backfill.sql` — JSONB array → experts + event_experts (legacy column retained)

## Verify locally

```bash
npm --prefix server run db:migrate
node tests/scripts/verify-migration-0038-experts.mjs
```
