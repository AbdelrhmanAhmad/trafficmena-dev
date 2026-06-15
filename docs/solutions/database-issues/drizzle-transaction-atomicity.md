---
title: Non-atomic auto-creation operations causing orphan records
category: database-issues
tags:
  - drizzle-orm
  - transactions
  - data-integrity
  - hono
  - postgresql
severity: high
component: server/routes/api
date_solved: 2025-12-30
symptoms:
  - Orphan LibraryAsset records without associated Events
  - Orphan Series records without associated Tracks
  - Partial data state after failed operations
  - Database inconsistency when second operation fails
root_cause: Auto-creation logic performed multiple related database operations as separate queries instead of wrapping them in a transaction
related:
  - ./security-issues/like-pattern-sql-injection.md
  - ./feature-implementations/learning-tracks-and-series-separation.md
---

# Drizzle ORM Transaction Atomicity

## Problem

When creating an Event, the code also auto-creates a LibraryAsset for recordings. When creating a Track, it auto-creates a Series. These were **separate database operations** - if the second operation failed, the first would still be committed, leaving orphan records.

### Before (Non-atomic)

```typescript
// events.ts - BAD: Two separate operations
const [created] = await db
  .insert(events)
  .values({...})
  .returning();

// If this fails, the event still exists without its asset!
await db.insert(libraryAssets).values({
  title: `${payload.title} - Recording`,
  eventId: created.id,
  isPublic: false,
});
```

## Solution

Wrap related operations in `db.transaction()` so they succeed or fail together.

### After (Atomic)

```typescript
// events.ts - GOOD: Single atomic transaction
const created = await db.transaction(async (tx) => {
  const [event] = await tx
    .insert(events)
    .values({
      title: payload.title,
      eventDescription: normalizeDescription(payload.description),
      date: new Date(payload.date),
      // ... other fields
    })
    .returning({...});

  // Uses tx (transaction context), not db
  await tx.insert(libraryAssets).values({
    title: `${payload.title} - Recording`,
    description: `Recording from ${payload.title}`,
    fileType: 'Video',
    eventId: event.id,
    isPublic: false,
  });

  return event;
});
```

## Files Changed

| File | Change |
|------|--------|
| `server/src/routes/api/events.ts` | Wrapped event + asset creation in transaction |
| `server/src/routes/api/tracks.ts` | Wrapped track + series creation in transaction |

## What Transactions Prevent

1. **Orphan Records**: If the second insert fails, the first is rolled back
2. **Race Conditions**: Concurrent requests can't interleave operations
3. **Partial State**: Database is always in a consistent state

## When to Use Transactions

Use `db.transaction()` when:

- Creating a parent record and related child records
- Updating multiple related tables
- Deleting with cascading effects not handled by schema
- Any operation where partial completion would be invalid

## Code Review Checklist

- [ ] Multiple tables modified in single handler? Use `db.transaction()`
- [ ] Transaction uses `tx` param (not outer `db`) for all operations?
- [ ] No manual try/catch that swallows errors inside transaction?
- [ ] Related deletes cascade via schema OR wrapped in transaction?

## Detection Script

Find potentially non-atomic operations:

```bash
# Find sequential db operations that might need transactions
rg "await db\.(insert|update|delete)" server/src/routes --type ts -A 5 | grep -B 5 "await db\."
```

## Existing Transaction Usage

The codebase correctly uses transactions in:

- `events.ts:576` - Event registration with row locking
- `tracks.ts:983` - Track reorder operations
- `tracks.ts:1003` - Track booking (atomic multi-event registration)
- `series.ts:408` - Series asset reordering

## External References

- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
