---
status: completed
priority: p1
issue_id: "052"
tags: [code-review, migration, database, deployment, data-integrity]
dependencies: []
---

# Add Event Format Migration Signoff Gate

## Problem Statement

The event-format migration now has a preflight SQL report, but production migration is still not gated by captured output and explicit human signoff. This migration changes pricing/access semantics and clears literal `online`/`offline` location text, so a script existing in the repo is not enough protection.

## Findings

- `server/drizzle/preflight_event_format_report.sql` exists and reports rows where the proposed backfill differs from the old inference.
- `server/drizzle/0018_fast_sleepwalker.sql` still applies the backfill directly when `db:migrate` runs.
- The repo still has no committed artifact template, runbook step, npm script, or release checklist requiring row-level review/signoff before applying production migration `0018`.
- The source plan explicitly required characterization, diff review, human signoff, then call-site swap.

## Proposed Solutions

### Option 1: Lightweight Release Gate

**Approach:** Add a migration runbook/checklist for `0018`, include the exact preflight command, require attaching saved output, and document a named approver before production migration.

**Pros:**
- Fast MVP-safe fix.
- No custom migration runner required.
- Makes the operational gate explicit and reviewable.

**Cons:**
- Still relies on human process discipline.
- CI cannot enforce that production signoff happened.

**Effort:** Small

**Risk:** Low

---

### Option 2: Scripted Preflight Command

**Approach:** Add an npm script that runs the preflight report and writes a timestamped artifact under an approved docs/runbook location, then document that artifact as required for deploy approval.

**Pros:**
- More repeatable than manual psql copy/paste.
- Produces a durable evidence artifact.

**Cons:**
- Needs environment-safe database access handling.
- Still needs human review of output.

**Effort:** Medium

**Risk:** Low/Medium

## Recommended Action

Implemented the lightweight release gate with a repeatable preflight command and a runbook that
requires human signoff before production migration `0018_fast_sleepwalker.sql`.

## Technical Details

**Affected files:**
- `server/drizzle/0018_fast_sleepwalker.sql`
- `server/drizzle/preflight_event_format_report.sql`
- `docs/runbooks/*` or equivalent deployment docs
- `package.json` / `server/package.json` if adding a script

**Database changes:**
- No new schema required for the gate itself.

## Resources

- Source review: `docs/reviews/2026-06-26-004-ticket-types-comparative-review.md`
- Plan: `docs/plans/2026-06-26-003-feat-ticket-types-merged-plan.md`

## Acceptance Criteria

- [x] Production migration instructions require running `preflight_event_format_report.sql`.
- [x] Instructions require storing the row-level output or an explicit "no rows" result.
- [x] Instructions require named human signoff before applying `0018`.
- [x] The process covers the irreversible location-text clearing and backup/snapshot expectation.

## Work Log

### 2026-06-26 - Review Discovery

**By:** Codex

**Actions:**
- Confirmed a preflight SQL file was added.
- Confirmed the migration itself still runs unconditionally under the normal Drizzle migration path.

**Learnings:**
- The code artifact closes part of the review finding, but the deployment safety gate is still incomplete.

### 2026-06-26 - Fixed

**By:** Codex

**Actions:**
- Added `server/package.json` script `db:preflight:event-format`.
- Added `docs/runbooks/event-format-0018-migration-preflight.md` with the required command,
  review steps, and human signoff note for `0018_fast_sleepwalker.sql`.
- Added regression coverage in `tests/unit/event-format-migration.test.ts`.

**Verification:**
- `npm run test:unit`
- `npm --prefix server run build`
- `npm run lint`
- `npm run build`
