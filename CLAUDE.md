# WARP.md

## Project Overview

TrafficMENA Hub is an MVP digital marketing education platform for the MENA region. The core user loop is: **Signup -> Browse Events -> Register -> Access Library**. Built with a modern TypeScript stack using Hono (backend) + React (frontend) + Drizzle ORM (PostgreSQL).

## Most Important Rules

1. This current project codebase is a production codebase and must be treated as such you must be very careful and make sure that the code is production ready without over-engineering and always follow the MVP mindset and don't build unrequested features or you must use the libraries and tools that are already available in the codebase and don't build custom code.
2. You must always start from an MVP approach and always must act from first principle thinking and use the second order thinking to uncover hidden patterns and connections and be pragmatic and avoid over engineering
3. Add concise, high-signal comments only when the intent isn’t obvious from clean code—think of them as quick guidance for the next engineer, not a narrative. Prioritize first-principles clarity and second-order awareness: never trade maintainable, well-structured code for commentary, and avoid over-engineering in the process

## Development Standards & Conventions

### MVP Mindset (CRITICAL)
*   **Validation First:** Do not build unrequested features.
*   **Speed:** Use "good enough" code. Refactor later.
*   **Simplicity:** Direct function calls over complex patterns.

### Coding Style
*   **TypeScript:** "Relaxed" mode (`noImplicitAny: false`). Speed over strictness.
*   **Styling:** Tailwind CSS with Shadcn UI components. **Do not** build custom primitives if a library version exists.
*   **State Management:** TanStack Query for server state.
*   **Path Aliases:** Use `@/` for imports (e.g., `import { Button } from '@/components/ui/button'`).

### Security
*   **API:** All endpoints must be protected (Better Auth).
*   **Validation:** Zod for payload validation.
*   **Sanitization:** DOMPurify for user content.

## Key Files for Reference
*   `AGENTS.md`: Detailed "AI Coder" instructions and status reports.
*   `server/src/index.ts`: Backend entry point.
*   `src/app/api/client.ts`: Frontend API client configuration.
*   `drizzle.config.ts`: Database schema configuration.

## Development Commands

```bash
# Install dependencies
npm install                           # Frontend dependencies
npm --prefix server install           # API dependencies

# Local Postgres (project-scoped, no Docker)
npm run db:start                      # Start PG on port 5433
npm run db:stop                       # Stop local Postgres
npm run db:status                     # Health check
npm run db:reset                      # Recreate with clean schema
npm run db:psql                       # Open psql shell

# Database migrations (Drizzle)
npm --prefix server run db:gen        # Generate migration SQL
npm --prefix server run db:migrate    # Apply migrations
npm --prefix server run db:studio     # Open Drizzle Studio

# Development servers (run in separate terminals)
npm run dev                           # Vite frontend on http://localhost:8080
npm --prefix server run dev           # Hono API on http://localhost:3001

# Build & lint
npm run build                         # Production frontend build
npm --prefix server run build         # Compile server TypeScript
npm run lint                          # Ultracite (Biome) lint
npm run format                        # Ultracite format
```

## Architecture

### Monorepo Structure

```
.
├── src/                    # React SPA (Vite + React 18 + TypeScript)
│   ├── app/               # API client layer, auth context, hooks
│   │   ├── api/           # Typed fetch helpers (fetchJson, typed fetchers)
│   │   ├── auth/          # AuthContext with OTP-based auth
│   │   └── hooks/         # App-wide data hooks
│   ├── features/          # Feature modules (events, library)
│   │   ├── events/        # Event CRUD, pages, components, hooks
│   │   └── library/       # Knowledge library components
│   ├── pages/             # Route pages (signup wizard, dashboard, admin)
│   ├── shared/            # Shared UI components, contexts, hooks
│   │   ├── components/ui/ # Shadcn/Radix UI primitives
│   │   └── context/       # Theme, Auth providers
│   └── components/        # TipTap editor components
├── server/                # Hono API (Node 20)
│   ├── src/
│   │   ├── routes/api/    # API route handlers
│   │   ├── db/            # Drizzle client + schema
│   │   ├── services/      # Business logic (email, rate limiting, invitations)
│   │   ├── auth/          # Better Auth config + plugins
│   │   └── config/        # Environment validation (Zod)
│   └── drizzle/           # Generated migration SQL files
├── local/postgres/bin/    # Project-scoped Postgres scripts
└── docs/                  # Operational documentation
```

### Key Architectural Patterns

**Frontend Data Flow:**
- All API calls go through `src/app/api/client.ts` using `fetchJson()`
- Always include `credentials: 'include'` for session cookies
- Path alias `@/` maps to `./src/`
- Vite proxies `/api` requests to `http://localhost:3001`

**Backend Route Pattern:**
- Routes registered in `server/src/routes/api/index.ts`
- Each route file exports a `registerXxxRoutes(app: Hono)` function
- Request validation with Zod schemas
- RBAC via `requireAdmin()`, `requireManager()` helpers from `utils.ts`

**Authentication:**
- Better Auth with email OTP plugin
- Session cookies managed automatically
- Auth endpoints: `/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/auth/session`, `/api/auth/logout`
- OTP sent via Plunk email service
- Rate limiting: 3 OTPs/10min, 10 OTPs/day per email

**Database:**
- Drizzle ORM with PostgreSQL 17.x
- Schema defined in `server/src/db/schema/index.ts`
- Uses UUID primary keys
- Key tables: `users`, `profiles`, `events`, `eventAttendees`, `libraryAssets`, `invitations`

### RBAC Role Hierarchy

```
owner  > admin > manager > expert > user
  4        3        2         1       0
```

- **user**: Read-only access to events and library
- **expert**: Can co-host/author content
- **manager**: CRUD events + library (no delete, no user management)
- **admin**: Full control except removing owners
- **owner**: Full system control

Role stored in `profiles.role`, normalized to lowercase. Legacy `member` values auto-converted to `user`.

## API Endpoints

```
POST /api/auth/otp/request     # Request OTP
POST /api/auth/otp/verify      # Verify OTP, create session
GET  /api/auth/session         # Get current session
POST /api/auth/logout          # Sign out

GET  /api/events               # List events (paginated, filterable)
GET  /api/events/:id           # Event detail
POST /api/events               # Create event (manager+)
PUT  /api/events/:id           # Update event (manager+)
DELETE /api/events/:id         # Delete event (admin+)
POST /api/events/:id/register  # Register for event
DELETE /api/events/:id/register # Cancel registration

GET  /api/library              # List library assets
GET  /api/library/:id          # Asset detail
POST /api/library              # Create asset (stub)
DELETE /api/library/:id        # Delete asset (stub)

GET  /api/users/me             # Current user profile
GET  /api/invitations          # List invitations (admin)
POST /api/invitations          # Single invite (admin)
POST /api/invitations/csv      # Bulk CSV invite (admin)

POST /api/uploads              # File upload to BunnyCDN (<=20MB)
GET  /api/settings             # Platform settings
PUT  /api/settings             # Update settings (admin)
```

## Environment Configuration

Copy `server/.env.example` to `server/.env`. Key variables:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5433/trafficmena_dev
DATABASE_ADMIN_URL=...        # For migrations (optional)
BETTER_AUTH_SECRET=...        # >=32 chars, unique in production
BETTER_AUTH_ISSUER=http://localhost:3001
CORS_ORIGIN=http://localhost:8080  # Comma-separated for multiple origins
PLUNK_API_KEY=...             # Email delivery
BUNNY_STORAGE_ZONE=...        # CDN storage
BUNNY_STORAGE_ACCESS_KEY=...
BUNNY_STORAGE_CDN_URL=https://trafficmena.b-cdn.net
```

## Feature Status (MVP)

| Module | Status | Notes |
|--------|--------|-------|
| Events | Complete | CRUD + registration |
| Invitations | Complete | Single + CSV, invite-only toggle |
| Knowledge Library | 60% | List/read live; create/delete stubs |
| Users | 80% | Service layer done, UI polish pending |
| Admin Dashboard | 70% | CRUD flows, analytics hidden |

Removed from MVP: products/commerce, subscriptions.

## Important Conventions

1. **No Supabase** - All Supabase code has been removed. Use Drizzle + Better Auth only.

2. **API Response Format** - Errors follow:
   ```json
   { "error": { "code": "ERROR_CODE", "message": "Human message" } }
   ```

3. **Session Cookies** - Always use `credentials: 'include'` when calling API from frontend.

4. **File Uploads** - Max 20MB via `/api/uploads`, stored in BunnyCDN.

5. **Security Headers** - CSP, HSTS (production), secure headers configured in `server/src/app.ts`.

## OpenSpec Integration

This project uses OpenSpec for change proposals. When working on new features, breaking changes, or architectural shifts:

1. Read `@/openspec/AGENTS.md` for spec format and conventions
2. Use slash commands: `/openspec:proposal`, `/openspec:apply`, `/openspec:archive`

## Quick Reference

- API routes: `server/src/routes/api/index.ts`
- Frontend hooks: `src/app/api/` and `src/features/**/hooks`
- Auth context: `src/app/auth/AuthContext.tsx`
- DB schema: `server/src/db/schema/index.ts`
- Admin runbook: `docs/admin-content-workflow.md`
- RBAC decision: `docs/rbac-decision.md`

## Status of Core Features
*   **Events:** Complete (Vertical slice).
*   **Invitations:** Functional (Single + CSV).
*   **Library:** Functional (Needs consolidation).
*   **User Management:** Service layer ready, UI needs updates.
*   **Products/Subscriptions:** **REMOVED** from MVP scope.

## AI Agent Operational Guidelines

### Agent Behavior Principles
- Prefer end-to-end verification; if blocked, state what's missing
- New dependencies: quick health check (recent releases/commits, community adoption)
- Web research: search early; quote exact errors; prefer 2024-2025 sources
- Keep files <~500 LOC; split and refactor when exceeded
- Use Conventional Commits format (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`)
- Add regression tests when fixing bugs (when it fits the scope)
- Use `trash` for file deletions (never `rm` directly)
- Style: telegraph mode for AGENTS.md updates; minimize token usage

### Git Safety Rules
- Safe by default: `git status/diff/log` are always ok; push only when user requests
- `git checkout` only for PR review or explicit user request
- Branch changes require user consent
- Destructive operations forbidden unless explicitly requested (`reset --hard`, `clean`, `rm`)
- Don't delete/rename unexpected files; stop and ask
- No repo-wide search-and-replace scripts; keep edits small and reviewable
- Avoid manual `git stash` (auto-stash during pull/rebase is fine)
- No commit amend unless explicitly asked
- Multi-agent awareness: check `git status/diff` before edits; ship small commits

### Critical Thinking Protocol
- Fix root cause, not symptoms (no band-aids)
- Unsure: read more code; if still stuck, ask with short options
- Conflicts: call out explicitly; pick the safer path
- Unrecognized changes: assume other agent made them; focus on your changes; if blocking, stop and ask
- Leave breadcrumb notes in conversation thread

### Documentation Practices
- Read relevant docs before coding
- Follow doc links until the domain makes full sense
- Keep notes short; update docs when behavior/API changes (no ship without updated docs)

### Quality Gates
- Use repo's package manager/runtime; no swaps without user approval
- Before handoff: run full gate (lint, typecheck, tests, docs)
- CI failures: view, fix, push, repeat until green
- Keep work observable (logs, console output, tail commands)


## Ultracite Enforcement Rules

### Accessibility (a11y)
- Don't use `accessKey` attribute on any HTML element
- Don't set `aria-hidden="true"` on focusable elements
- Don't add ARIA roles, states, and properties to elements that don't support them
- Don't use distracting elements like `<marquee>` or `<blink>`
- Only use the `scope` prop on `<th>` elements
- Don't assign non-interactive ARIA roles to interactive HTML elements
- Make sure label elements have text content and are associated with an input
- Don't assign interactive ARIA roles to non-interactive HTML elements
- Don't assign `tabIndex` to non-interactive HTML elements
- Don't use positive integers for `tabIndex` property
- Don't include "image", "picture", or "photo" in img alt prop
- Don't use explicit role property that's the same as the implicit/default role
- Make static elements with click handlers use a valid role attribute
- Always include a `title` element for SVG elements
- Give all elements requiring alt text meaningful information for screen readers
- Make sure anchors have content that's accessible to screen readers
- Assign `tabIndex` to non-interactive HTML elements with `aria-activedescendant`
- Include all required ARIA attributes for elements with ARIA roles
- Make sure ARIA properties are valid for the element's supported roles
- Always include a `type` attribute for button elements
- Make elements with interactive roles and handlers focusable
- Give heading elements content that's accessible to screen readers (not hidden with `aria-hidden`)
- Always include a `lang` attribute on the html element
- Always include a `title` attribute for iframe elements
- Accompany `onClick` with at least one of: `onKeyUp`, `onKeyDown`, or `onKeyPress`
- Accompany `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`
- Include caption tracks for audio and video elements
- Use semantic elements instead of role attributes in JSX
- Make sure all anchors are valid and navigable
- Ensure all ARIA properties (`aria-*`) are valid
- Use valid, non-abstract ARIA roles for elements with ARIA roles
- Use valid ARIA state and property values
- Use valid values for the `autocomplete` attribute on input elements
- Use correct ISO language/country codes for the `lang` attribute

### React and JSX Best Practices
- Don't use the return value of React.render
- Make sure all dependencies are correctly specified in React hooks
- Make sure all React hooks are called from the top level of component functions
- Don't forget key props in iterators and collection literals
- Don't define React components inside other components
- Don't use event handlers on non-interactive elements
- Don't assign to React component props
- Don't use both `children` and `dangerouslySetInnerHTML` props on the same element
- Don't use dangerous JSX props (except when sanitized with DOMPurify in our project)
- Don't use Array index in keys
- Don't insert comments as text nodes
- Don't assign JSX properties multiple times
- Don't add extra closing tags for components without children
- Use `<>...</>` instead of `<Fragment>...</Fragment>`
- Watch out for possible "wrong" semicolons inside JSX elements
- Don't pass children as props

### TypeScript Best Practices (Adapted for Relaxed Mode)
- Don't use TypeScript enums
- Don't export imported variables
- Don't use TypeScript namespaces
- Don't use non-null assertions with the `!` postfix operator (use optional chaining instead)
- Don't use parameter properties in class constructors
- Use `as const` instead of literal types and type annotations
- Use either `T[]` or `Array<T>` consistently
- Initialize each enum member value explicitly
- Use `export type` for types
- Use `import type` for types
- Make sure all enum members are literal values
- Don't use TypeScript const enum
- Don't declare empty interfaces
- Note: `noImplicitAny` and `strictNullChecks` are disabled in our config for rapid development

### Code Complexity and Quality
- Don't use consecutive spaces in regular expression literals
- Don't use the `arguments` object
- Don't use the comma operator
- Don't use empty type parameters in type aliases and interfaces
- Keep functions within reasonable Cognitive Complexity score
- Don't nest describe() blocks too deeply in test files
- Don't use unnecessary boolean casts
- Use for...of statements instead of Array.forEach
- Don't create classes that only have static members
- Don't use this and super in static contexts
- Don't use unnecessary catch clauses
- Don't use unnecessary constructors
- Don't use unnecessary continue statements
- Don't export empty modules
- Don't use unnecessary escape sequences in regular expression literals
- Don't use unnecessary fragments
- Don't use unnecessary labels
- Don't rename imports to the same name
- Don't use unnecessary string concatenation
- Use arrow functions instead of function expressions
- Use Date.now() to get milliseconds
- Use .flatMap() instead of map().flat()
- Use optional chaining instead of chained logical expressions
- Use while loops instead of for loops when appropriate

### Correctness and Safety
- Don't assign a value to itself
- Don't return a value from a setter
- Don't use lexical declarations in switch clauses
- Don't use variables that haven't been declared
- Don't write unreachable code
- Make sure super() is called correctly in constructors
- Don't use control flow statements in finally blocks
- Don't use optional chaining where undefined values aren't allowed
- Remove unused function parameters
- Remove unused imports
- Remove unused variables
- Use isNaN() when checking for NaN
- Make sure typeof expressions are compared to valid values
- Don't use await inside loops
- Don't use expressions where the operation doesn't change the value
- Handle Promise-like statements appropriately
- Don't hardcode sensitive data like API keys and tokens (use environment variables)
- Don't let variable declarations shadow outer scope variables
- Don't use unsafe negation
- Don't use var (use const/let)

### API & Security Specific
- Gate every Hono endpoint behind Better Auth sessions and role checks where required
- Keep Plunk / Better Auth secrets on the server only; never leak them into the bundle
- Validate request payloads with Zod (or equivalent) before touching the database
- Use the shared `AppErrorHandler` helpers when raising API errors back to the SPA
- Sanitize any user-generated HTML with DOMPurify before storage or rendering
- Avoid logging PII (email, OTP codes, session tokens) except in secure audit tables

### Style and Consistency
- Don't use global `eval()`
- Don't use nested ternary expressions
- Don't reassign function parameters
- Use `String.slice()` instead of `String.substr()` and `String.substring()`
- Don't use template literals without interpolation
- Use single `if` statements instead of nested `if` clauses
- Use `const` declarations for variables that are only assigned once
- Put default function parameters last
- Use the `**` operator instead of `Math.pow`
- Use template literals over string concatenation
- Use `new` when throwing an error
- Don't throw non-Error values
- Use `===` and `!==` instead of `==` and `!=`
- Don't use duplicate case labels
- Don't use duplicate class members
- Don't use duplicate conditions in if-else-if chains
- Don't use empty block statements
- Don't let switch clauses fall through
- Use Number.isFinite instead of global isFinite
- Use Number.isNaN instead of global isNaN

### Testing Best Practices
- Don't use export or module.exports in test files
- Don't use focused tests (`.only`)
- Place assertions inside test blocks
- Don't use disabled tests (`.skip`) in production code

### Common Ultracite Commands
- `npx ultracite init` - Initialize Ultracite in your project
- `npx ultracite format` - Format and fix code automatically
- `npx ultracite lint` - Check for issues without fixing
- `npm run lint` - Run lint check via npm script
- `npm run format` - Format all files via npm script
