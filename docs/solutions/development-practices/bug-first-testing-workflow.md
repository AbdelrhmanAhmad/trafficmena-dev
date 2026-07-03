---
title: Bug-First Testing Workflow
category: development-practices
tags: [testing, debugging, workflow, tdd]
severity: high
components: [testing, development]
symptoms:
  - Bug fixes that don't address root cause
  - Regressions after fixes are applied
  - Unclear verification that bug is actually fixed
root_cause: Jumping to fix bugs without first reproducing them in tests
resolution_date: 2026-02-02
---

# Bug-First Testing Workflow

## Problem

When bugs are reported, the natural instinct is to immediately start fixing them. This leads to:
1. Fixes that address symptoms, not root cause
2. No proof the bug is actually fixed
3. Potential regressions in the future
4. Wasted time on wrong approaches

## Solution

**New rule added to CLAUDE.md and AGENTS.md:**

> When I report a bug, don't start by trying to fix it. Instead, start by writing a test that reproduces the bug. Then, have subagents try to fix the bug and prove it with a passing test.

### Workflow

```
1. Bug Reported
    ↓
2. Write Failing Test
    ↓
3. Verify Test Fails (confirms bug exists)
    ↓
4. Implement Fix
    ↓
5. Verify Test Passes (confirms fix works)
    ↓
6. Check No Regressions (run full test suite)
    ↓
7. Commit with Test + Fix
```

### Example

**Bug report:** "AOV calculator returns NaN when the revenue input is cleared"

**Step 1: Write a failing test.** The suite is Node's built-in runner (`node --test`) over pure logic/helpers — assert on the calculator's compute function directly, not a rendered component (there is no React Testing Library / jsdom here). See `tests/unit/*.test.ts` for the real pattern.

```typescript
// tests/unit/aov-calculator.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateAov } from '../../src/features/calculators/lib/aov'; // illustrative: the pure compute fn

describe('calculateAov', () => {
  it('returns null for empty/invalid inputs instead of NaN', () => {
    assert.equal(calculateAov({ revenue: '', orders: '10' }), null);
    assert.equal(calculateAov({ revenue: '1000', orders: '' }), null);
  });
});
```

**Step 2: Verify the test fails**
```bash
npm run test:unit
# not ok - calculateAov returned NaN, expected null
```

**Step 3: Implement the fix**
```typescript
// Guard empty/invalid inputs before dividing
if (!revenue || !orders || Number.isNaN(Number(revenue)) || Number.isNaN(Number(orders))) {
  return null; // Don't calculate
}
```

**Step 4: Verify the test passes**
```bash
npm run test:unit
# ok
```

### Benefits

1. **Proof of bug** - Test demonstrates the exact issue
2. **Proof of fix** - Passing test proves the fix works
3. **Regression prevention** - Test remains in suite forever
4. **Documentation** - Test describes expected behavior
5. **Parallel work** - Multiple agents can try fixes against the test

### Using Subagents

For complex bugs, use parallel subagents:

```
Main Agent: Writes the failing test
    ↓
Subagent 1: Tries fix approach A
Subagent 2: Tries fix approach B
Subagent 3: Tries fix approach C
    ↓
Main Agent: Picks the fix with passing test + best code quality
```

## Files Changed

- `AGENTS.md` - Added rule #4 about bug-first testing
- `CLAUDE.md` - Added same rule for consistency

## When to Skip

Only skip this workflow when:
- The bug is a trivial typo
- Writing a test would take significantly longer than the fix
- The bug is in configuration, not code

## Prevention

1. Make bug-first testing the default workflow
2. Reject PRs that fix bugs without accompanying tests
3. Use subagents to parallelize fix attempts
4. Celebrate tests that catch regressions
