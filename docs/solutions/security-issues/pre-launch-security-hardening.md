---
title: "Pre-Launch Security Hardening Patterns"
category: security
subcategory: input-validation
tags:
  - UUID-validation
  - CSRF-protection
  - DOMPurify
  - XSS-prevention
  - transactions
  - race-conditions
severity: high
components:
  - server/routes/api/events.ts
  - server/routes/api/library.ts
  - server/routes/api/series.ts
  - server/utils/csrf.ts
  - src/app/api/client.ts
  - src/features/library/components/LibraryAssetForm.tsx
symptoms:
  - invalid-uuid-database-errors
  - race-conditions-on-concurrent-registration
  - missing-csrf-protection
  - xss-vulnerabilities-in-forms
root_cause: |
  Multiple security patterns were inconsistently applied across the codebase:
  1. UUID validation missing on some route parameters
  2. CSRF protection needed for SPA with cookie-based auth
  3. DOMPurify sanitization missing in some form submissions
  4. Transaction safety needed for concurrent operations
resolution_date: 2026-01-26
commits:
  - 2f23025 # Transaction safety and UUID validation
  - daa4525 # Frontend performance optimization
  - c5d4ff0 # Event cancellation system
---

# Pre-Launch Security Hardening Patterns

## Problem Summary

Before launch, a comprehensive security review identified several patterns that needed consistent application across the codebase:

1. **UUID Validation** - Route parameters passed directly to database queries without format validation
2. **CSRF Protection** - SPA with cookie-based auth needed protection against cross-site request forgery
3. **XSS Prevention** - Rich text form inputs needed sanitization before storage
4. **Transaction Safety** - Concurrent operations could cause race conditions (TOCTOU vulnerabilities)

## Solutions Implemented

### 1. UUID Validation Pattern

**Schema Definition:**
```typescript
// server/src/routes/api/utils.ts or inline in route file
import { z } from 'zod';

const uuidParamSchema = z.string().uuid();
```

**Usage Pattern:**
```typescript
app.get('/events/:id', async (c) => {
  const idParam = c.req.param('id');
  const idParsed = uuidParamSchema.safeParse(idParam);
  if (!idParsed.success) {
    return c.json({
      error: { code: 'INVALID_PARAM', message: 'Event ID must be a valid UUID.' }
    }, 400);
  }
  const id = idParsed.data;

  // Safe to use in database queries
  const [event] = await db.select().from(events).where(eq(events.id, id));
});
```

**Files Updated:**
- `server/src/routes/api/series.ts` - 7 endpoints
- `server/src/routes/api/library.ts` - 3 endpoints
- `server/src/routes/api/events.ts` - Multiple endpoints

**Why This Matters:**
- Prevents malformed UUIDs from reaching database
- Returns clear 400 error instead of cryptic database errors
- Defense in depth against potential injection vectors

---

### 2. CSRF Protection (Double-Submit Cookie Pattern)

**Server-side Middleware:**
```typescript
// server/src/utils/csrf.ts
const CSRF_COOKIE_NAME = 'tm_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();

  // Safe methods just ensure token exists
  if (SAFE_METHODS.has(method)) {
    if (!getCookie(c, CSRF_COOKIE_NAME)) {
      issueCsrfToken(c);
    }
    return next();
  }

  // State-changing methods require token match
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);
  const headerToken = c.req.header(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return c.json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token.' } }, 403);
  }

  // Also validate Origin header
  const origin = c.req.header('origin');
  if (origin && !isOriginAllowed(origin)) {
    return c.json({ error: { code: 'CSRF_ORIGIN', message: 'Invalid request origin.' } }, 403);
  }

  return next();
}
```

**Client-side Integration:**
```typescript
// src/app/api/client.ts
export function getCsrfHeaders() {
  const csrfToken = getCookieValue('tm_csrf');
  return csrfToken ? { 'x-csrf-token': csrfToken } : {};
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = { ...init?.headers };

  // Auto-attach CSRF token for state-changing requests
  if (!SAFE_METHODS.has(method)) {
    Object.assign(headers, getCsrfHeaders());
  }

  return fetch(input, { credentials: 'include', headers, ...init });
}
```

**Cookie Configuration:**
```typescript
setCookie(c, CSRF_COOKIE_NAME, token, {
  path: '/',
  sameSite: 'Strict',
  httpOnly: false,  // Must be readable by JavaScript
  secure: isProduction,
  maxAge: 60 * 60 * 24,
});
```

**Exempt Paths:**
- `/api/payments/webhook` - HMAC-verified instead
- `/api/payments/webhook_json` - HMAC-verified instead

---

### 3. DOMPurify Sanitization Pattern

**Import and Usage:**
```typescript
// src/features/library/components/LibraryAssetForm.tsx
import DOMPurify from 'dompurify';

const handleSubmit = async (values: FormValues) => {
  // Sanitize HTML content before sending to API
  const sanitizedDescription = values.description?.trim()
    ? DOMPurify.sanitize(values.description.trim())
    : null;

  const payload = {
    title: values.title.trim(),
    description: sanitizedDescription,
    // ... other fields
  };

  await onSubmit(payload);
};
```

**For Plain Text Fields (Strip All HTML):**
```typescript
// For rejection reasons, admin notes, etc.
const sanitizedReason = reason
  ? DOMPurify.sanitize(reason, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  : undefined;
```

**Shared Component for Rendering:**
```typescript
// src/shared/components/SanitizedHtml.tsx
export function SanitizedHtml({ html, className }: Props) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <div
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

---

### 4. Transaction Safety with FOR UPDATE Locks

**Pattern for Capacity-Limited Operations:**
```typescript
const result = await db.transaction(async (tx) => {
  // 1. Lock the resource row
  const [event] = await tx
    .select({ id: events.id, maxAttendees: events.maxAttendees })
    .from(events)
    .where(eq(events.id, eventId))
    .for('update');

  if (!event) throw new ApiError('EVENT_NOT_FOUND', 'Event not found.', 404);

  // 2. Lock existing registration if any
  const [existing] = await tx
    .select({ id: eventAttendees.id, status: eventAttendees.status })
    .from(eventAttendees)
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
    .for('update')
    .limit(1);

  // 3. Check capacity INSIDE transaction (after locks acquired)
  if (event.maxAttendees !== null) {
    const [{ count: current }] = await tx
      .select({ count: count(eventAttendees.id) })
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.status, 'active')
      ));

    if (Number(current) >= event.maxAttendees) {
      throw new ApiError('EVENT_FULL', 'Event capacity reached.', 409);
    }
  }

  // 4. Perform the write (safe because we have locks)
  await tx.insert(eventAttendees).values({ eventId, userId, status: 'active' });

  return { success: true };
});
```

**When to Use FOR UPDATE:**
- Capacity checks before insert
- Status transitions (pending -> active)
- Financial operations
- Any read-then-write pattern

---

## Prevention Strategies

### PR Review Checklist

```markdown
## Security Checklist

### UUID Validation
- [ ] All `:id` route params validated with `uuidParamSchema.safeParse()`
- [ ] No raw `c.req.param()` passed to database queries

### XSS Prevention
- [ ] Rich text inputs sanitized with DOMPurify before API submission
- [ ] All `dangerouslySetInnerHTML` uses sanitized content

### Transaction Safety
- [ ] Read-then-write operations wrapped in `db.transaction()`
- [ ] Capacity checks use `FOR UPDATE` locks
- [ ] Status transitions are atomic

### CSRF Protection
- [ ] New state-changing endpoints tested for CSRF rejection
- [ ] Frontend calls use `fetchJson()` (auto-attaches token)
```

### Detection Commands

**Find unvalidated UUID params:**
```bash
rg "c\.req\.param\('id'\)" server/src/routes --type ts | \
  grep -v "safeParse\|validateUuid"
```

**Find unsanitized dangerouslySetInnerHTML:**
```bash
rg "dangerouslySetInnerHTML" src --type tsx | \
  grep -v "DOMPurify\|sanitize"
```

**Find non-transactional capacity checks:**
```bash
rg "maxAttendees.*count" server/src --type ts -B 5 | \
  grep -v "transaction"
```

---

## Test Cases

### UUID Validation Tests
```typescript
it('rejects invalid UUID', async () => {
  const response = await fetch('/api/events/not-a-uuid');
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe('INVALID_PARAM');
});
```

### CSRF Protection Tests
```typescript
it('rejects POST without CSRF token', async () => {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test' }),
  });
  expect(response.status).toBe(403);
});
```

### Race Condition Tests
```typescript
it('prevents overbooking', async () => {
  const event = await createEvent({ maxAttendees: 1 });
  const users = await Promise.all([createUser(), createUser()]);

  const results = await Promise.allSettled(
    users.map(u => registerForEvent(event.id, u.token))
  );

  const successes = results.filter(r => r.status === 'fulfilled');
  expect(successes.length).toBe(1);
});
```

---

## Related Documentation

- [CSRF Security Documentation](../../security-csrf.md)
- [Database Safety Patterns](../database-safety-patterns.md)
- [SQL LIKE Pattern Injection](./like-pattern-sql-injection.md)
- [Branch Review Report](../../branch-review-important-enhancements.md)

## External References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [PostgreSQL FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
