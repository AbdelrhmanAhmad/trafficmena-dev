---
status: pending
priority: p1
issue_id: "009"
tags: [code-review, performance, resilience, payment-gateway]
dependencies: []
---

# No Circuit Breaker for Fawaterk API

## Problem Statement

If Fawaterk API is slow or down, all payment operations hang for up to 10 seconds per request. With no circuit breaker pattern, the system cannot fail fast during outages.

**Impact at Scale:**
- 100 concurrent users during Fawaterk outage = 100 connections held for 10s each
- Event loop blocked processing other requests
- Payment system becomes completely unresponsive
- No fail-fast mechanism to shed load

## Findings

**Agent:** performance-oracle
**Severity:** HIGH (P1) - Critical for production resilience

**Location:** `server/src/services/fawaterk.ts` lines 8-21

```typescript
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS, // 10 seconds - too long
): Promise<Response> {
  // No retry, no circuit breaker, no failure tracking
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## Proposed Solutions

### Solution A: Simple State-Based Circuit Breaker (Recommended)
**Pros:** No new dependencies, MVP-appropriate
**Cons:** Not as sophisticated as library solutions
**Effort:** Low
**Risk:** Low

```typescript
let fawaterkCircuitState = 'closed';
let failureCount = 0;
let circuitOpenedAt = 0;
const FAILURE_THRESHOLD = 5;
const COOL_DOWN_MS = 30_000;

async function fetchWithCircuitBreaker(url, options, timeoutMs) {
  if (fawaterkCircuitState === 'open') {
    if (Date.now() - circuitOpenedAt > COOL_DOWN_MS) {
      fawaterkCircuitState = 'half-open';
    } else {
      throw new Error('Payment service temporarily unavailable');
    }
  }

  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);
    if (response.ok) {
      failureCount = 0;
      fawaterkCircuitState = 'closed';
    }
    return response;
  } catch (error) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) {
      fawaterkCircuitState = 'open';
      circuitOpenedAt = Date.now();
    }
    throw error;
  }
}
```

### Solution B: Use cockatiel or opossum library
**Pros:** Battle-tested, more features
**Cons:** New dependency
**Effort:** Low
**Risk:** Very Low

## Recommended Action

Solution A for MVP - implement simple circuit breaker pattern.

## Technical Details

**Affected Files:**
- `server/src/services/fawaterk.ts`

## Acceptance Criteria

- [ ] After 5 consecutive failures, circuit opens
- [ ] Open circuit fails immediately with "service unavailable" error
- [ ] After 30s cooldown, circuit enters half-open state
- [ ] Successful request in half-open closes circuit
- [ ] Add logging for circuit state changes
- [ ] Test: Mock Fawaterk failures and verify circuit behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from security review | Identified by performance-oracle agent |

## Resources

- PR: feat/payment-gateway-mvp branch
- Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
