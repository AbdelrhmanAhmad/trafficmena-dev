---
title: External numeric IDs must be bigint or text, never int4
category: database-issues
tags:
  - postgresql
  - schema-design
  - drizzle-orm
  - payments
  - fawaterk
severity: high
component: server/db/schema
date_solved: 2026-07-03
symptoms:
  - 'PG error 22003: value "…" is out of range for type integer'
  - A working feature suddenly fails on every write, with no code or API change
  - The failing value is an external-provider id larger than 2,147,483,647
root_cause: An external-controlled numeric identifier was stored in an int4 (integer) column; the external counter's growth is not ours to control and eventually crossed the int32 max.
related:
  - ../payment-gateway/payment-gateway-compound-knowledge.md
  - ../database-safety-patterns.md
---

# External ID Column Sizing (int4 overflow)

## Problem

On 2026-07-03 payments silently stopped being created. The production logs showed a Postgres error,
**not** a dead gateway:

```
22003: value "2304130044" is out of range for type integer
```

The Fawaterk **v2 API was alive**. Our own write was failing: `payments.fawaterk_invoice_id` was an
`integer` (int4, max **2,147,483,647**), and Fawaterk's invoice counter had crossed it
(`2304130044 > 2147483647`). Every new payment insert threw `22003` and rolled back.

This was the true root cause of the outage — easy to misread as "the v2 API died", because the
symptom (no payments) is identical. The evidence that distinguishes them is the `22003` in the DB
logs versus a gateway/OAuth error.

## Root cause (first principles)

**The size of an external identifier is not ours to control.** A third party's counter grows on its
own schedule; any column that stores it must assume it will eventually exceed any bound we pick. An
`int4` caps at ~2.1 billion — a boundary a busy payment provider crosses routinely.

## The rule

External-controlled numeric IDs are **`bigint`** or **`text`**, never `int4`.

- `bigint` (int8) caps at 9.2×10¹⁸.
- In Drizzle, use `bigint('col', { mode: 'number' })` when the value stays under **2⁵³** (JS's safe
  integer max) so it deserializes as a plain JS `number`; use `{ mode: 'bigint' }` or `text` if it
  can exceed 2⁵³.
- Prefer `text` when the id is opaque or non-numeric (v3's `intent_key` is a short alphanumeric
  string — `text` was correct there regardless).

## How it was cured

The v3 migration fixed it **incidentally**, not deliberately: v3 keys off
`fawaterk_intent_key` (`text`) and `fawaterk_transaction_id`
(`bigint('fawaterk_transaction_id', { mode: 'number' })`, safely under 2⁵³), so no int4 sits on the
write path anymore (`server/src/db/schema/index.ts`).

The legacy `fawaterk_invoice_id` column **stays `integer`**: it is audit-only historical data that v3
never writes, so widening it is churn without benefit. The lesson applies to **future** external-id
columns, not to retrofitting dead ones.

## Checklist for new external-id columns

- [ ] Is this id assigned by an external system (payment provider, CRM, upstream API)?
- [ ] If numeric → `bigint`, never `integer`. Choose `{ mode: 'number' }` only if it stays < 2⁵³.
- [ ] If opaque / possibly non-numeric → `text`.
- [ ] Never assume the external counter is "small enough" today — it grows without our involvement.
