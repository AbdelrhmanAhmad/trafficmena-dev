---
title: SQL LIKE pattern injection via unescaped search input
category: security-issues
tags:
  - sql-injection
  - like-pattern
  - input-validation
  - drizzle-orm
  - search
severity: medium
component: server/routes/api
date_solved: 2025-12-30
symptoms:
  - Search queries returning unexpected results
  - Users able to use wildcard characters in search
  - Potential for denial-of-service via expensive pattern matching
  - Inconsistent search behavior across the application
root_cause: User-supplied search strings were interpolated directly into SQL LIKE patterns without escaping special characters (%, _, \)
related:
  - ../database-issues/drizzle-transaction-atomicity.md
---

# SQL LIKE Pattern Injection Prevention

## Problem

Search queries used user input directly in LIKE patterns without escaping special characters:

```typescript
// BAD: User can inject wildcards
if (search) {
  filters.push(ilike(libraryAssets.title, `%${search}%`));
}
```

### Attack Scenarios

| Input | Effect |
|-------|--------|
| `%admin%` | Matches ALL records containing "admin" |
| `_____` | Matches any 5-character string |
| `%` | Matches everything (data enumeration) |
| Complex patterns | DoS via expensive regex evaluation |

## Solution

### Step 1: Add Escape Utility

Added to `server/src/routes/api/utils.ts`:

```typescript
/**
 * Escapes special characters in a string for safe use in SQL LIKE patterns.
 * Prevents users from injecting wildcards (%, _) or escape characters (\).
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (char) => `\\${char}`);
}
```

### Step 2: Apply to All Search Queries

```typescript
import { escapeLikePattern } from './utils.js';

// GOOD: Escaped user input
if (search) {
  filters.push(ilike(libraryAssets.title, `%${escapeLikePattern(search)}%`));
}
```

> **Numeric columns cast to text still need escaping.** Admin attendee search matches an integer id via `CAST(<col> AS TEXT) ILIKE ${pattern}` (e.g. the Fawaterk transaction id added in the v3 migration). Because the match is `ILIKE %…%`, unescaped `%`/`_` in the search term act as wildcards — build the pattern with `escapeLikePattern` exactly as for text columns:
> ```typescript
> const searchPattern = `%${escapeLikePattern(normalizedSearch)}%`;
> or(
>   ilike(users.name, searchPattern),
>   sql`CAST(${payments.fawaterkTransactionId} AS TEXT) ILIKE ${searchPattern}`,
> );
> ```

## Files Changed

| File | Line | Change |
|------|------|--------|
| `server/src/routes/api/utils.ts` | 187-189 | Added `escapeLikePattern()` function |
| `server/src/routes/api/events.ts` | 375 | Applied to event search |
| `server/src/routes/api/tracks.ts` | 681 | Applied to track search |
| `server/src/routes/api/library.ts` | 173 | Applied to library search |
| `server/src/routes/api/series.ts` | 82 | Applied to series search |

Since the original fix, `escapeLikePattern()` has also been adopted by newer search sites:
`users.ts`, `seriesGrants.ts`, and `invitations.ts`.

## What Escaping Prevents

1. **Wildcard Injection**: `%` and `_` become literal characters
2. **Data Enumeration**: Can't use `%` to match everything
3. **DoS via Patterns**: Complex regex patterns are neutralized
4. **Inconsistent Results**: Search behavior is predictable

## Code Review Checklist

- [ ] All `ilike()` / `like()` calls use `escapeLikePattern()` on user input?
- [ ] Search strings have reasonable max length in Zod schema?
- [ ] No raw string interpolation in SQL LIKE patterns?
- [ ] Utility imported from `./utils.js`?

## Detection Script

Find unescaped LIKE patterns:

```bash
# Find ilike() calls that might not use escapeLikePattern
rg "ilike\([^,]+,\s*\`" server/src --type ts | grep -v escapeLikePattern
```

## Test Cases

`escapeLikePattern` is a pure function — unit-test it directly with the repo's `node --test` runner (`tests/unit/*.test.ts`):

```typescript
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeLikePattern } from '../../server/src/routes/api/utils.ts';

describe('escapeLikePattern', () => {
  it('escapes %, _, and \\; leaves normal text unchanged', () => {
    assert.equal(escapeLikePattern('100%'), '100\\%');
    assert.equal(escapeLikePattern('test_user'), 'test\\_user');
    assert.equal(escapeLikePattern('path\\file'), 'path\\\\file');
    assert.equal(escapeLikePattern('%_\\'), '\\%\\_\\\\');
    assert.equal(escapeLikePattern('normal search'), 'normal search');
  });
});
```

## Additional Best Practices

1. **Limit search length** via Zod schema:
   ```typescript
   search: z.string().max(100).optional()
   ```

2. **Consider full-text search** for complex search requirements (PostgreSQL `tsvector`)

3. **Rate limit** search endpoints to prevent enumeration attacks

## External References

- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PostgreSQL LIKE Operator](https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-LIKE)
- [Drizzle ORM - ilike operator](https://orm.drizzle.team/docs/operators#ilike)
