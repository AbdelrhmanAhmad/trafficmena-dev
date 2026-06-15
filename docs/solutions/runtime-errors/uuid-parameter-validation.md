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

Created a reusable parameter parser that validates UUID format:

```typescript
// In server/src/routes/api/events.ts

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseEventIdParam(id: string): string {
  if (!UUID_REGEX.test(id)) {
    throw new HTTPException(400, {
      message: 'Invalid event ID format. Expected UUID.'
    });
  }
  return id;
}

// Usage in route handlers
app.get('/events/:id', async (c) => {
  const eventId = parseEventIdParam(c.req.param('id'));

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId)
  });

  if (!event) {
    throw new HTTPException(404, { message: 'Event not found' });
  }

  return c.json(event);
});
```

## Alternative: Zod Validation

For more complex validation, use Zod:

```typescript
import { z } from 'zod';

const eventIdSchema = z.string().uuid('Invalid event ID format');

function parseEventIdParam(id: string): string {
  const result = eventIdSchema.safeParse(id);
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.issues[0].message
    });
  }
  return result.data;
}
```

## Error Response Format

Consistent error format for validation failures:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid event ID format. Expected UUID."
  }
}
```

## Files Changed

- `server/src/routes/api/events.ts` - Added `parseEventIdParam()` helper
- Applied to all route handlers that accept `id` parameter

## Apply to Other Routes

Same pattern for tracks, library, series:

```typescript
// Generic helper (could move to utils.ts)
function parseUuidParam(value: string, paramName: string): string {
  if (!UUID_REGEX.test(value)) {
    throw new HTTPException(400, {
      message: `Invalid ${paramName} format. Expected UUID.`
    });
  }
  return value;
}

// Usage
const trackId = parseUuidParam(c.req.param('id'), 'track ID');
const assetId = parseUuidParam(c.req.param('assetId'), 'asset ID');
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
# HTTP 400: {"error": {"message": "Invalid event ID format. Expected UUID."}}

# Non-existent but valid UUID should return 404
curl -i http://localhost:3001/api/events/00000000-0000-0000-0000-000000000000
# HTTP 404: {"error": {"message": "Event not found"}}
```
