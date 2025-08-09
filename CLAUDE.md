# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (runs on port 8080)
- **Build for production**: `npm run build` 
- **Build for development**: `npm run build:dev`
- **Linting**: `npm run lint` (ESLint with TypeScript, React hooks, and import ordering)
- **Preview production build**: `npm run preview`

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Radix UI components + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: TanStack Query for server state, React Context for auth
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

### Key Directories

#### `/src/pages/`
- Main application routes including admin panel, user dashboard, meetups, and multi-step signup flow
- Admin routes are protected and include user management, library management, meetups, and products
- Signup flow: 6 steps (Step0-Step5) plus email verification

#### `/src/components/`
- **ui/**: shadcn/ui components (Button, Dialog, Form, etc.)
- **Layout components**: Header, Footer, DashboardLayout, AdminLayout  
- **Route protection**: ProtectedRoute, AdminProtectedRoute
- **Business components**: EventCard, LibraryGrid, UserProfileDropdown
- **onboarding/**: Multi-step user onboarding components

#### `/src/hooks/`
- **queries/**: TanStack Query hooks for data fetching (useEventsQuery, useLibraryAssetsQuery, etc.)
- **Custom hooks**: useIsAdmin, usePagination, useSecureQuery, useMobile

#### `/src/utils/`
- **errorHandling.ts**: Standardized error handling with AppErrorHandler class and useErrorHandler hook
- **Security utilities**: CSRF protection, input sanitization, file validation
- **Date utilities**: Date formatting and manipulation helpers

#### `/src/integrations/supabase/`
- **client.ts**: Supabase client configuration
- **types.ts**: Auto-generated TypeScript types from database schema

#### `/supabase/migrations/`
- Database migration files for schema evolution

### Authentication & Authorization
- Supabase Auth with email/password and session management
- AuthContext provides user, session, loading, and signOut functionality
- Role-based access control with admin users
- Protected routes for authenticated users and admin-only areas

### Error Handling Standards
Always use the standardized error handling pattern:

```typescript
import { useErrorHandler } from '@/utils/errorHandling';

const { handleError } = useErrorHandler();

try {
  const { data, error } = await supabaseCall();
  if (error) {
    handleError(error);
    return;
  }
} catch (error) {
  handleError(error);
}
```

### Database Schema
Core entities: users, events (formerly meetups), event_attendees, library_assets, products, user_skills, user_profiles

### Code Style & Conventions
- **Import ordering**: Enforced via ESLint with builtin → external → internal → relative imports
- **Path aliases**: `@/` maps to `./src/`
- **TypeScript**: Relaxed configuration (noImplicitAny: false, strictNullChecks: false)
- **Styling**: Tailwind CSS with custom design system colors and component variants
- **Components**: Use shadcn/ui components, follow existing patterns for layout and styling

### Development Workflow
1. The project uses Lovable for AI-assisted development alongside traditional IDE workflow
2. Changes made via Lovable are automatically committed
3. ErrorBoundary components wrap major route sections for error isolation
4. TanStack Query handles caching with 5-minute stale time and window focus disabled