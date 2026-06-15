# refactor(db): Consolidate Drizzle Migrations into Single Schema File

## Overview

Consolidate 20 Drizzle ORM migration files (`0000`-`0019`) into a single, clean initial schema migration. This reduces cognitive overhead, simplifies fresh database setup, and creates a clear baseline for future migrations.

## Problem Statement

The project has accumulated 20 migration files over development:
- Mix of auto-generated names (`0000_ancient_living_tribunal.sql`) and manual names (`0015_payment_gateway.sql`)
- Data migrations mixed with schema migrations (0005-0008 are profile backfills)
- Migration 0019 exists but is not in `_journal.json` (out of sync)
- Legacy `server/migrations/` directory adds confusion

**Current State:**
```
server/drizzle/
├── 0000_ancient_living_tribunal.sql   # Initial schema
├── 0001_romantic_wolverine.sql        # Better Auth
├── 0002_invitation_activation.sql     # Invitations
├── 0003_rbac_roles_fixed.sql          # RBAC default
├── 0004_user_role_cleanup.sql         # Drop 'member' role
├── 0005_profile_backfill.sql          # DATA: Backfill profiles
├── 0006_profile_name_cleanup.sql      # DATA: Populate names
├── 0007_profile_name_reset.sql        # DATA: Reset derived names
├── 0008_profile_name_reset_case.sql   # DATA: Case-insensitive fix
├── 0009_spooky_amphibian.sql          # thumbnail_url
├── 0010_wide_newton_destine.sql       # track_assets (later dropped)
├── 0011_harsh_kabuki.sql              # track_bookings
├── 0012_separate_tracks_series.sql    # series tables
├── 0013_content_permission_system.sql # is_public, track_id FK
├── 0014_allow_individual_booking.sql  # allow_individual_booking
├── 0015_payment_gateway.sql           # payments, subscriptions
├── 0016_payment_gateway_security_fixes.sql
├── 0017_track_bookings_payment_id.sql
├── 0018_payment_expiration_index.sql
├── 0019_payment_reservations.sql      # NOT IN JOURNAL
└── meta/
    ├── _journal.json                  # Only tracks 0-18
    └── 0000_snapshot.json ... 0018_snapshot.json
```

---

## Critical Questions (MUST Answer Before Implementation)

### BLOCKER Questions

| # | Question | Why It Matters | Default Assumption |
|---|----------|----------------|-------------------|
| 1 | **Is this a local-only dev database, or do you have production/staging databases?** | If production exists with migrations applied, we need a compatibility strategy | Assume dev-only (safest approach) |
| 2 | **Do you want the consolidated migration for NEW databases only, or also for existing databases?** | New-only is simple; existing requires compatibility shim | New databases only |
| 3 | **Should data migrations (0005-0008 profile backfills) be included in the consolidated file?** | These are one-time fixes; may not be needed for fresh installs | Exclude (data was already fixed) |
| 4 | **What happened with migration 0019? Was it applied manually?** | Out-of-sync journal needs fixing before consolidation | Add to journal first |

---

## Proposed Solution

### Approach: New Databases Only (Recommended for MVP)

Generate a single `0000_initial_schema.sql` from the current database schema. This becomes the starting point for all new database instances. Existing databases continue using the original 20 migrations (no changes needed).

**Why this approach:**
- Zero risk to existing databases
- Simple implementation
- Follows MVP mindset
- Can always do full consolidation later if needed

### Implementation Phases

#### Phase 1: Audit & Fix Journal (Pre-requisite)

1. Add migration 0019 to `_journal.json` if it was applied
2. Verify schema code matches migration state

```bash
# Check if 0019 is applied
npm run db:psql
SELECT * FROM __drizzle_migrations ORDER BY id;

# Check schema drift
npm --prefix server run db:push -- --dry-run
# Should show: "No schema changes detected"
```

#### Phase 2: Generate Consolidated Migration

**Option A: From Database (Recommended)**
```bash
# Dump current schema from database
pg_dump --schema-only --no-owner --no-privileges \
  "postgresql://user:pass@localhost:5433/trafficmena_dev" \
  > server/drizzle-new/0000_initial_schema.sql
```

**Option B: From Drizzle (Alternative)**
```bash
# Reset drizzle folder and regenerate
mkdir server/drizzle-new
# Update drizzle.config.ts temporarily to point to drizzle-new
npx drizzle-kit generate --name=initial_schema
```

#### Phase 3: Verify Schema Equivalence

```bash
# Create two test databases
createdb trafficmena_test_old
createdb trafficmena_test_new

# Apply original 20 migrations to test_old
DATABASE_URL=...test_old npm --prefix server run db:migrate

# Apply consolidated migration to test_new
DATABASE_URL=...test_new npm --prefix server run db:migrate

# Compare schemas
pg_dump --schema-only trafficmena_test_old > /tmp/old_schema.sql
pg_dump --schema-only trafficmena_test_new > /tmp/new_schema.sql
diff /tmp/old_schema.sql /tmp/new_schema.sql
```

#### Phase 4: Replace Migration Folder

```bash
# Archive old migrations
mv server/drizzle server/drizzle-archived

# Use new consolidated migrations
mv server/drizzle-new server/drizzle

# Update journal
# Create new _journal.json with single entry
```

#### Phase 5: Clean Up Legacy Directory

```bash
# Review legacy migrations
cat server/migrations/001_init.sql      # Duplicate of 0000
cat server/migrations/002_seed_events.sql   # Seed data
cat server/migrations/003_platform_settings.sql  # platform_settings

# If seed data is needed, move to separate seed script
# If platform_settings is in Drizzle schema, safe to delete
rm -rf server/migrations/  # Or use trash
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Single `0000_initial_schema.sql` file contains complete schema
- [ ] Fresh `npm run db:reset && npm --prefix server run db:migrate` works
- [ ] Schema comparison shows zero differences from original 20 migrations
- [ ] `npm --prefix server run db:studio` shows all tables correctly
- [ ] Application starts and all API endpoints work

### Non-Functional Requirements
- [ ] Migration file is well-commented with table groupings
- [ ] Legacy `server/migrations/` directory removed or archived
- [ ] `_journal.json` reflects single migration entry
- [ ] README or docs updated if migration process changed

---

## File Changes

### New Files

#### server/drizzle/0000_initial_schema.sql
```sql
-- TrafficMENA Hub - Consolidated Initial Schema
-- Generated: 2025-01-18
-- Consolidates migrations 0000-0019

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE "public"."user_role" AS ENUM ('owner', 'admin', 'manager', 'expert', 'user');
CREATE TYPE "public"."user_type" AS ENUM ('learner', 'expert');
CREATE TYPE "public"."event_type" AS ENUM ('Event', 'Meetup', 'Mastermind', 'Retreat');
-- ... (all enums)

-- ============================================
-- AUTH TABLES (Better Auth)
-- ============================================
CREATE TABLE "auth_otp" ( ... );
CREATE TABLE "auth_sessions" ( ... );
-- ...

-- ============================================
-- CORE TABLES
-- ============================================
CREATE TABLE "users" ( ... );
CREATE TABLE "profiles" ( ... );
CREATE TABLE "events" ( ... );
-- ...

-- ============================================
-- PAYMENT TABLES
-- ============================================
CREATE TABLE "payments" ( ... );
CREATE TABLE "subscriptions" ( ... );
CREATE TABLE "event_reservations" ( ... );
CREATE TABLE "track_reservations" ( ... );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX ... ;
```

#### server/drizzle/meta/_journal.json
```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1737216000000,
      "tag": "0000_initial_schema",
      "breakpoints": true
    }
  ]
}
```

### Deleted Files
- `server/drizzle/0000_ancient_living_tribunal.sql` through `0019_payment_reservations.sql` (20 files)
- `server/drizzle/meta/0000_snapshot.json` through `0018_snapshot.json` (19 files)
- `server/migrations/` directory (3 files) - if confirmed safe

### Archived (Optional)
- `server/drizzle-archived/` - original 20 migrations for reference

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema drift (consolidated ≠ original) | Medium | High | Schema comparison test before replacing |
| Breaking existing databases | Low | Critical | New-DBs-only approach avoids this |
| Missing data from seed migrations | Medium | Medium | Review seed data needs separately |
| Team confusion during transition | Low | Low | Clear communication + docs update |

---

## ERD (Current Schema - For Reference)

```mermaid
erDiagram
    users ||--o| profiles : has
    users ||--o{ auth_sessions : has
    users ||--o{ auth_accounts : has

    profiles ||--o{ event_attendees : registers
    profiles ||--o{ track_bookings : books
    profiles ||--o{ invitations : sends

    events ||--o{ event_attendees : has
    events ||--o{ event_reservations : has
    events }o--|| tracks : belongs_to

    tracks ||--o{ track_events : contains
    tracks ||--o{ track_bookings : has
    tracks ||--o{ track_reservations : has
    tracks ||--o{ series : has

    series ||--o{ series_assets : contains
    library_assets ||--o{ series_assets : in

    payments ||--o{ track_bookings : for
    payments ||--o{ event_reservations : for
    payments ||--o{ track_reservations : for
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Answer critical questions above
- [ ] Confirm database backup exists (if any prod/staging)
- [ ] Notify team about planned migration changes

### Implementation
- [ ] Fix migration 0019 journal entry
- [ ] Run schema drift check (`db:push --dry-run`)
- [ ] Generate consolidated migration from database
- [ ] Create new `_journal.json`
- [ ] Run schema equivalence test
- [ ] Replace migration folder
- [ ] Test fresh database setup
- [ ] Test application startup and key flows
- [ ] Remove/archive legacy directories

### Post-Implementation
- [ ] Update team documentation
- [ ] Commit with message: `refactor(db): consolidate 20 migrations into single initial schema`
- [ ] Team notification for local DB reset

---

## References

### Internal
- Database schema: `server/src/db/schema/index.ts`
- Drizzle config: `server/drizzle.config.ts`
- Migration commands: `server/package.json` (db:gen, db:migrate, db:studio)

### External
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit Generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [GitHub Discussion: Migration Squashing](https://github.com/drizzle-team/drizzle-orm/discussions/3492)

---

## Notes

**Why no official squash command?** Drizzle ORM does not have a built-in migration squash feature as of January 2025. This is an actively discussed feature request. The manual approach above is the recommended workaround.

**Data migrations excluded:** Migrations 0005-0008 contained one-time data fixes (profile name backfills). Since this data has already been corrected in existing databases, these are excluded from the consolidated schema. Fresh databases won't have the malformed data that needed fixing.
