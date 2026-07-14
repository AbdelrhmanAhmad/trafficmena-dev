---
title: UUID Parameter Validation in API Routes
category: runtime-errors
tags: [api, validation, uuid, error-handling]
severity: medium
components: [api, events, validation]
symptoms:
  - Cryptic database errors when passing invalid UUIDs
  - "invalid input syntax for type uuid" PostgreSQL errors
  - 500 errors instead of proper 400 validation errors
root_cause: API routes not validating UUID format before database queries
resolution_date: 2026-02-02
---

# UUID Parameter Validation in API Routes

## Problem

When an invalid UUID was passed to an API endpoint, the error bubbled up from PostgreSQL as a 500 server error:

```
error: invalid input syntax for type uuid: "not-a-uuid"
```

Users saw a generic server error instead of a helpful validation message.

## Solution

Validate the UUID with **Zod** before the database query, and raise the project's `ApiError` (which serializes to the standard `{ error: { code, message } }` envelope) so the caller gets a 400 instead of a Postgres 500. The house convention is a small per-route helper wrapping `z.string().uuid().safeParse`:

```typescript
// server/src/routes/api/events.ts
const uuidParamSchema = z.string().uuid();

function parseEventIdParam(eventId: string): string {
  const parsed = uuidParamSchema.safeParse(eventId);
  if (!parsed.success) {
    throw new ApiError('INVALID_PARAM', 'Event ID must be a valid UUID.', 400);
  }
  return parsed.data;
}

// Usage in route handlers
app.get('/events/:id', async (c) => {
  const eventId = parseEventIdParam(c.req.param('id'));
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    throw new ApiError('NOT_FOUND', 'Event not found', 404);
  }
  return c.json({ data: event });
});
```

> Do **not** hand-roll a `UUID_REGEX` + Hono `HTTPException` — that shape appears nowhere in this codebase. Every route validates with `z.string().uuid()` and raises `ApiError`.

## Error Response Format

Consistent error format for validation failures:

```json
{
  "error": {
    "code": "INVALID_PARAM",
    "message": "Event ID must be a valid UUID."
  }
}
```

The code varies by route: `INVALID_PARAM` (events), `INVALID_ID` (tracks), `INVALID_INPUT` (payments) — all through `ApiError`. `VALIDATION_ERROR` is not used for this.

## Files Changed

- `server/src/routes/api/events.ts` - `parseEventIdParam()` helper (`z.string().uuid()` + `ApiError`)
- Applied per route file that accepts an `id` parameter

## Apply to Other Routes

The guard is repeated **per route file**, not centralized in `utils.ts` — each declares its own `z.string().uuid()` schema/helper. Two shapes are in use:

```typescript
// tracks.ts — a validator that RETURNS a result (doesn't throw); the caller decides:
const idValidation = validateUuid(c.req.param('id'), 'track ID');
if (!idValidation.valid) {
  return c.json({ error: idValidation.error }, 400); // error is { code: 'INVALID_ID', message }
}
const id = idValidation.value;

// payments.ts / promoCodes.ts — inline at the call site:
const parsed = z.string().uuid().safeParse(id);
if (!parsed.success) throw new ApiError('INVALID_INPUT', 'Invalid id', 400);
```

## Prevention

1. **Validate early** - Check parameters before any database operations
2. **Clear error messages** - Tell the user what format is expected
3. **Reusable helpers** - Create parameter parsers for common types
4. **Consistent error format** - Use the same error structure across all endpoints

## Testing

```bash
# Invalid UUID should return 400
curl -i http://localhost:3001/api/events/not-a-uuid
# HTTP 400: {"error": {"code": "INVALID_PARAM", "message": "Event ID must be a valid UUID."}}

# Non-existent but valid UUID should return 404
curl -i http://localhost:3001/api/events/00000000-0000-0000-0000-000000000000
# HTTP 404: {"error": {"message": "Event not found"}}
```
