---
title: "fix: Phone completion banner shows even when phone number exists"
type: fix
status: completed
date: 2026-02-15
---

# fix: Phone completion banner shows even when phone number exists

## Problem Statement

The `PhoneCompletionBanner` component always shows the "Add your WhatsApp number" banner regardless of whether the user has a phone number, because it reads `phone_number` from the wrong object level.

## Root Cause

In `src/shared/components/PhoneCompletionBanner.tsx:8-18`:

```tsx
const { data: profile, isLoading } = useCurrentUser({ enabled: !!user });
// ...
if (profile?.phone_number) return null;
```

`useCurrentUser()` returns a TanStack Query result where `data` is `CurrentUserResponse`:

```tsx
// src/app/api/users.ts:52-55
type CurrentUserResponse = {
  user: AuthSessionUser | null;
  profile: ProfileRecord | null;  // <-- phone_number lives HERE
};
```

By aliasing `data` to `profile`, the check `profile?.phone_number` looks for `phone_number` on the **top-level response object** (`{ user, profile }`), which is always `undefined`. The actual phone number is at `data.profile.phone_number`.

## Fix

**File:** `src/shared/components/PhoneCompletionBanner.tsx`

Two-line change — rename the destructured variable and update the condition:

```tsx
// Before (line 8):
const { data: profile, isLoading } = useCurrentUser({ enabled: !!user });
// profile?.phone_number → always undefined

// After:
const { data, isLoading } = useCurrentUser({ enabled: !!user });
// data?.profile?.phone_number → correct path
```

Update line 18 accordingly:

```tsx
// Before:
if (profile?.phone_number) return null;

// After:
if (data?.profile?.phone_number) return null;
```

## Acceptance Criteria

- [x] Banner is hidden when user has a phone number in their profile
- [x] Banner is shown when user has no phone number (null or empty)
- [x] Banner still dismissible via the X button
- [x] No layout shift during loading state

## References

- `src/shared/components/PhoneCompletionBanner.tsx` — banner component (the bug)
- `src/app/hooks/useCurrentUser.ts` — hook returning `CurrentUserResponse`
- `src/app/api/users.ts:36-50` — `mapProfile` and `CurrentUserResponse` type
- `server/src/routes/api/users.ts:160-195` — `/users/me` endpoint returning `{ user, profile }`
