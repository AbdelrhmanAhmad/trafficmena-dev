# Merged migration reconciliation (old DB + live data)

Use this runbook when a database already contains customer records **and** commerce
schema from pre-merge numbering, but the merged journal expects:

- upstream `0016`–`0021`
- renumbered commerce `0022`–`0032`

Typical symptoms:

- `column payments.fawaterk_intent_key does not exist`
- `db:migrate` fails with `type "certificate_status" already exists`
- Drizzle shows `0022`–`0026` pending while tables already exist

## Do not use

- `npm --prefix server run db:gen` on an old populated database
- blind `db:migrate` without audit/reconcile on merged legacy DBs
- manual DDL patches outside the reconcile/idempotent scripts

## Safe workflow

### 1. Audit (read-only)

```bash
npm --prefix server run db:migrate:audit
```

Review pending tags and fingerprint status.

### 2. Dry-run reconcile

```bash
npm --prefix server run db:migrate:reconcile
```

Expected actions on a typical merged legacy DB:

| Tags | Action |
|------|--------|
| `0016`–`0021` | apply idempotent upstream gap **or** stamp if already present |
| `0022`–`0026` | **stamp only** when commerce fingerprint matches (no replay) |
| `0027`–`0032` | already applied |

### 3. Apply reconcile + migrate

Local / staging with backup:

```bash
npm --prefix server run db:migrate:safe
```

Production-like databases additionally require:

```bash
MIGRATION_RECONCILE_SIGNOFF=baseline-reviewed-backup-confirmed
MIGRATION_RECONCILE_SIGNOFF_BY="name/email"
npm --prefix server run db:migrate:reconcile:apply
npm --prefix server run db:migrate
```

For migration `0018_fast_sleepwalker.sql` on production-like hosts, the existing
event-format signoff gate still applies via `guard-event-format-migration.mjs`.

## What the reconcile script does

1. **Never deletes data**
2. **Never replays** commerce `CREATE TYPE` / `CREATE TABLE` on populated DBs
3. Applies **idempotent upstream gap** SQL for `0016`–`0021` when objects are missing
4. **Stamps** Drizzle hashes for migrations whose schema fingerprint already matches
5. Runs in a transaction when `--apply` is used

## After success

- `payments.fawaterk_intent_key` exists
- payment reconciliation job runs without schema errors
- `npm --prefix server run db:migrate:audit` reports zero pending target tags
