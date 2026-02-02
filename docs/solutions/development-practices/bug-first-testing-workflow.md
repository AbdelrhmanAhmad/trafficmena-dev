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

**Bug report:** "Calculator shows NaN when user clears the input"

**Step 1: Write failing test**
```typescript
// tests/calculators/aov-calculator.test.ts
describe('AOVCalculator', () => {
  it('should handle empty inputs without showing NaN', () => {
    render(<AOVCalculator />);

    const revenueInput = screen.getByLabelText(/revenue/i);
    const ordersInput = screen.getByLabelText(/orders/i);

    // User enters values then clears them
    fireEvent.change(revenueInput, { target: { value: '1000' } });
    fireEvent.change(ordersInput, { target: { value: '10' } });
    fireEvent.change(revenueInput, { target: { value: '' } });

    // Should not display NaN
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
```

**Step 2: Verify test fails**
```bash
npm test -- aov-calculator
# FAIL: expected NaN not to be in document
```

**Step 3: Implement fix**
```typescript
// Handle empty or invalid inputs
if (!revenue || !orders || Number.isNaN(parseFloat(revenue))) {
  return null; // Don't calculate
}
```

**Step 4: Verify test passes**
```bash
npm test -- aov-calculator
# PASS
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
