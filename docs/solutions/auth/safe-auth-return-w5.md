---
module: auth
tags: [phase2, w5, redirect, security, open-redirect]
problem_type: feature
---

# Safe Auth Return Redirect (W5)

## Summary

After sign-in or signup (including OTP), users return to the exact internal page that initiated authentication — path, query string, and hash preserved.

## Rules

- **Allowed:** `/meetups/123?tab=details#agenda`, `/dashboard/library`, etc.
- **Blocked:** `https://evil.com`, `//evil.com`, `javascript:`, `data:`, backslash tricks, encoded protocol-relative URLs
- **Fallback:** `/dashboard`
- **Storage:** `sessionStorage` (`trafficmena:auth-return-path`), consumed once after success
- **RBAC:** Return URL does not bypass role checks; admin routes still require admin roles

## Key files

- `src/shared/utils/authReturnPath.ts` — sanitizer + session storage
- `src/shared/utils/authNavigation.ts` — redirect helpers
- `src/shared/utils/postSignupRedirect.ts` — generic path priority over legacy contexts
- `src/shared/components/layout/ProtectedRoute.tsx`
- `src/pages/SignIn.tsx`, `src/pages/signup/CheckEmail.tsx`

## Out of scope

- Payment gateway (Fawaterk) redirect URLs
- Auto-resume checkout after return
- TanStack Start migration
