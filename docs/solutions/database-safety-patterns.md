# Database Safety Patterns

Prevention strategies for common database safety issues in this codebase.

## Issue 1: Non-atomic Multi-table Operations

### The Problem

When creating related records across multiple tables without a transaction, partial failures can leave the database in an inconsistent state.

```typescript
// BAD: Non-atomic - if child insert fails, orphan parent exists
const [series] = await db.insert(series).values(seriesData).returning();
await db.insert(seriesAssets).values(assetsData); // If this fails, series has no assets
```

### Best Practices

1. **Transaction Rule**: Any operation touching 2+ tables MUST use `db.transaction()`

```typescript
// GOOD: Atomic transaction
const result = await db.transaction(async (tx) => {
  const [series] = await tx.insert(seriesTbl).values(seriesData).returning();
  await tx.insert(seriesAssets).values(
    assetIds.map((id, i) => ({ seriesId: series.id, assetId: id, sortOrder: i }))
  );
  return series;
});
```

2. **Error Handling**: Let transaction auto-rollback on throw

```typescript
await db.transaction(async (tx) => {
  const [parent] = await tx.insert(parentTbl).values(data).returning();

  // If validation fails mid-transaction, throw - Drizzle auto-rolls back
  if (!isValid(parent)) {
    throw new Error('Validation failed');
  }

  await tx.insert(childTbl).values({ parentId: parent.id });
});
```

3. **Pattern Recognition**: Use transactions when you see:
   - Multiple `db.insert()` calls in sequence
   - Parent ID passed to child record creation
   - Delete operations affecting related tables
   - Bulk updates that must all succeed or none

### Code Review Checklist

- [ ] Multiple tables modified in single handler? Use `db.transaction()`
- [ ] Transaction uses `tx` param (not outer `db`) for all operations?
- [ ] No manual try/catch that swallows errors inside transaction?
- [ ] Related deletes cascade via schema OR wrapped in transaction?

### Test Cases

```typescript
// Test: Transaction rollback on child insert failure
it('rolls back parent if child insert fails', async () => {
  const countBefore = await db.select({ count: count() }).from(series);

  await expect(
    db.transaction(async (tx) => {
      await tx.insert(series).values({ title: 'Test' });
      throw new Error('Simulated child failure');
    })
  ).rejects.toThrow();

  const countAfter = await db.select({ count: count() }).from(series);
  expect(countAfter[0].count).toBe(countBefore[0].count);
});

// Test: Verify atomicity of multi-table creates
it('creates series with assets atomically', async () => {
  const result = await createSeriesWithAssets(validData);

  const seriesRow = await db.select().from(series).where(eq(series.id, result.id));
  const assetsRows = await db.select().from(seriesAssets).where(eq(seriesAssets.seriesId, result.id));

  expect(seriesRow).toHaveLength(1);
  expect(assetsRows.length).toBeGreaterThan(0);
});
```

### Detection Patterns

**Grep for potential violations:**
```bash
# Find sequential inserts (potential non-atomic)
rg "await db\.insert.*\n.*await db\.insert" --multiline server/src

# Find inserts outside transactions
rg "await db\.(insert|update|delete)" server/src/routes --type ts | grep -v "tx\."
```

---

## Issue 2: LIKE Pattern Injection

### The Problem

SQL LIKE patterns use `%` and `_` as wildcards. Unsanitized user input can:
- Cause performance issues with leading wildcards
- Return unintended results
- Enable information disclosure

```typescript
// BAD: User input directly in LIKE
const results = await db
  .select()
  .from(users)
  .where(ilike(users.name, `%${userInput}%`)); // userInput = "%" matches everything!
```

### Best Practices

1. **Always Use `escapeLikePattern()`**: Located in `server/src/routes/api/utils.ts`

```typescript
import { escapeLikePattern } from './utils.js';

// GOOD: Escaped user input
const safeSearch = escapeLikePattern(userInput);
const results = await db
  .select()
  .from(users)
  .where(ilike(users.name, `%${safeSearch}%`));
```

2. **Implementation Reference**:

```typescript
// server/src/routes/api/utils.ts
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (char) => `\\${char}`);
}
```

3. **Search Input Limits**: Apply reasonable length limits

```typescript
const searchSchema = z.object({
  search: z.string().max(100).optional(), // Limit length
});
```

### Code Review Checklist

- [ ] All `ilike()` / `like()` calls use `escapeLikePattern()` on user input?
- [ ] Search strings have reasonable max length in Zod schema?
- [ ] No raw string interpolation in SQL LIKE patterns?

### Test Cases

```typescript
// Test: LIKE special characters are escaped
it('escapes LIKE wildcards in search', async () => {
  // Create asset with special chars in title
  await db.insert(libraryAssets).values({ title: 'Test%Asset' });

  // Search for literal "%" - should not match everything
  const results = await searchAssets('%');

  // Should only match assets with literal "%" in title, not all assets
  expect(results.every(r => r.title.includes('%'))).toBe(true);
});

// Test: Underscore wildcard is escaped
it('escapes underscore wildcard', async () => {
  await db.insert(libraryAssets).values([
    { title: 'Test_Asset' },
    { title: 'TestXAsset' },
  ]);

  const results = await searchAssets('Test_Asset');

  // Should only match literal underscore, not single-char wildcard
  expect(results).toHaveLength(1);
  expect(results[0].title).toBe('Test_Asset');
});

// Test: Backslash is escaped
it('escapes backslash in search', async () => {
  await db.insert(libraryAssets).values({ title: 'Path\\File' });

  const results = await searchAssets('\\');
  expect(results.some(r => r.title.includes('\\'))).toBe(true);
});
```

### Detection Patterns

**Grep for potential violations:**
```bash
# Find ilike/like with string interpolation (potential injection)
rg "ilike\([^,]+,\s*\`" server/src --type ts

# Verify escapeLikePattern usage
rg "ilike|like\(" server/src/routes --type ts -A2 | grep -v escapeLikePattern
```

**Biome/ESLint Custom Rule Concept:**

```json
// Custom pattern to flag in code review tools
{
  "pattern": "ilike\\([^)]+\\$\\{(?!.*escapeLikePattern)",
  "message": "Use escapeLikePattern() for user input in LIKE patterns"
}
```

---

## Quick Reference

### When to Use Transactions

| Scenario | Transaction Required? |
|----------|----------------------|
| Single table insert | No |
| Parent + child inserts | Yes |
| Update with related cleanup | Yes |
| Bulk updates (same table) | Yes (for atomicity) |
| Read-only queries | No |
| Delete with cascade (schema-defined) | No |
| Delete with manual cleanup | Yes |

### Current Codebase Usage

Transactions are already used correctly in:
- `server/src/routes/api/events.ts` - Event + attendee operations
- `server/src/routes/api/series.ts` - Series + asset reordering
- `server/src/routes/api/tracks.ts` - Track + event associations

`escapeLikePattern` is used in:
- `server/src/routes/api/events.ts`
- `server/src/routes/api/library.ts`
- `server/src/routes/api/series.ts`
- `server/src/routes/api/tracks.ts`

**Known Issue**: `server/src/routes/api/invitations.ts` line 347 does NOT escape the search parameter. This should be fixed.

---

## Pre-commit Checks

Add to CI/pre-commit hooks:

```bash
#!/bin/bash
# check-db-safety.sh

# Check for potential non-atomic multi-table operations
echo "Checking for non-atomic operations..."
if rg "await db\.(insert|update|delete)" server/src/routes --type ts | grep -v "tx\." | grep -v "transaction"; then
  echo "WARNING: Found db operations outside transactions - verify atomicity"
fi

# Check for unescaped LIKE patterns
echo "Checking for LIKE pattern safety..."
if rg 'ilike\([^,]+,\s*`%\$\{' server/src --type ts | grep -v escapeLikePattern; then
  echo "ERROR: Found ilike with unescaped user input"
  exit 1
fi

echo "Database safety checks passed"
```
