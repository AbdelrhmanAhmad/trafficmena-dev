# AGENTS.md

This file provides guidance to AI Coder when working with code in this repository.

## TrafficMENA Hub - MVP Digital Marketing Education Platform

**Status:** MVP Development | Focus on Core Features | Ship Fast, Learn Faster

**IMPORTANT:** This is an MVP (Minimum Viable Product). Prioritize simplicity, speed to market, and user validation over technical perfection.

**Latest Backend Update (9 Oct 2025):** Hono now exposes the functional MVP APIs — `/api/auth/otp/*`, `/api/events` (list/detail/register/cancel), `/api/library` (list/detail/update), `/api/invitations` (single-send/list/CSV/accept with Better Auth provisioning), and `/api/users/me`. These endpoints run against the Drizzle/Postgres 17.6 stack with Better Auth sessions. All new frontend or automation work must consume these APIs; Supabase clients have been removed from the runtime and are no longer shipped in this repository.

You are an expert in TypeScript, React, Vite, Shadcn UI, Radix UI, Tailwind CSS, and the current Hono + Better Auth + Drizzle stack. Historical Supabase knowledge is optional and only needed when reading legacy documentation.

---

## Part 1: MVP Platform Overview & Current State

**TrafficMENA Hub** is an MVP digital marketing education platform specifically designed for the Middle East and North Africa (MENA) region. The MVP focuses on validating the core business model: connecting aspiring marketers with industry experts through events and educational content.

### MVP Architecture Status (Current State Assessment)

**Overall System Health:** MVP-Ready with Simplification Needed (Code Quality: B+ 83/100)
- ✅ Zero diagnostic errors across codebase
- ✅ MVP-appropriate security implementation
- ✅ Essential audit trails and access controls
- ✅ Modern development tooling for rapid iteration
- 🔄 Vertical slice architecture migration 75% complete (consider reverting for MVP simplicity)

### Core Feature Implementation Status

**📋 8 Core Modules - Implementation Status:**

1. **✅ Event Management System** - **COMPLETE** (Fully migrated to vertical slice)
   - Professional workshops and seminars with QR attendance
   - Guest expert management (JSONB structure)
   - Multi-type events (Event, Meetup, Mastermind, Retreat)
   - Complete admin-to-public integration with library linking

2. **✅ Invitations System** - **COMPLETE** (Modern implementation)
- MVP uses simplified Hono `/api/invitations` endpoints for single-send/list/CSV/accept
   - The queue/backoff prototype shipped during the Supabase era has been removed; rely on the current endpoints only (bulk CSV enhancements remain deferred)
   - Comprehensive event tracking (sent, delivered, opened, clicked, accepted) captured in schema
   - Integration-ready for email service providers (Plunk API)
   - **Update 17 Oct 2025:** Bulk CSV parser now respects quoted fields, optional headers, and validates emails so multi-line/custom messages no longer produce phantom invites.

3. **❌ Products & E-commerce** - **REMOVED FOR MVP SCOPE**
   - Product catalog, payment plumbing, and related services fully excised
   - Payment providers and mock checkout flows no longer part of the codebase
   - Future commerce work will require fresh planning aligned with validated demand

4. **🔄 Knowledge Library** - **60% COMPLETE** (Basic structure, needs consolidation)
   - Secure content management with DOMPurify
   - Multiple content types (video_url, document_url, embed_url)
   - Event-library linking via foreign keys
   - Usage analytics (view_count, download_count)
   - Direct BunnyCDN uploads (PDF, PPT, images) capped at 20 MB
   - Admin deletions remove library records; storage cleanup backlog for Bunny assets
   - Missing: Advanced content curation, recommendation engine

5. **📋 User Management** - **80% COMPLETE** (Service layer complete, UI needs update)
   - Multi-step onboarding with skills tracking (7 steps)
   - Comprehensive user profiles with audit logging
- Skills management with proper foreign key relationships
- Profile rows now auto-provision on first OTP login; dashboard skill selections capture future personalization data even though no recommendation engine ships yet
   - Role-based access control with privilege escalation prevention
- RBAC tiers: Owner (full control), Admin (full control except removing owners), Manager (create/update events & library, no delete, no invites/users), Expert (co-host/author only), User (view-only — marketing copy still calls them “members”)

6. **❌ Subscriptions** - **REMOVED FOR MVP SCOPE**
   - Subscription pages, hooks, and schema dependencies removed to simplify launch
   - Library access is open to all authenticated members
   - Reintroduce subscriptions later with real payment + entitlement flow

7. **✅ Security Framework** - **COMPLETE** (MVP-appropriate implementation)
   - Essential protection layers (CSP, CSRF, RLS, XSS prevention)
   - Basic input sanitization for MVP security
   - Simple audit trails for critical actions
   - Role-based access control suitable for MVP scale

8. **📋 Admin Dashboard** - **70% COMPLETE** (Sufficient for MVP)
   - User management with basic role capabilities
   - Event management with CRUD operations
   - Library management with content upload
   - Deferred for post-MVP: Analytics dashboard, performance monitoring

### Technical Architecture Overview

**Frontend Technology Stack:**
- **React 18.3.1** + **TypeScript 5.5.3** (Relaxed mode for rapid development)
- **Vite 5.4.1** with SWC compiler for fast builds
- **Shadcn UI** + 20+ Radix primitives (50+ components implemented)
- **TailwindCSS 3.4.11** with custom MENA design system
- **TanStack Query 5.56.2** with optimal caching (5-minute stale time)
- **TipTap Editor** with comprehensive rich text capabilities

**Backend Technology Stack:**
- **Hono (Node 20 LTS)** serving REST APIs (`/api/auth/otp/*`, `/api/events`, `/api/library`, `/api/users/me`)
- **Better Auth** email OTP with in-memory rate limiting and Plunk server integration
- **Drizzle ORM + PostgreSQL 17.6** (roles: `trafficmena_admin`, `trafficmena_app`)
- **Postmark/Plunk email delivery** (server-side only) and basic audit trails via Postgres tables
- **Caddy + systemd** deployment plan for the Hetzner VPS (documented in warp-reviewed-plan.md)

**Development Tools:**
- **Ultracite (Biome)** for 10-100x faster linting and formatting
- **Path aliases** (`@/`) for clean imports
- **Zero configuration** development setup for MVP speed
- **MVP-focused security** with essential protections

---

## MVP PRINCIPLES - MUST READ

### This is an MVP - Core Principles to Follow:

1. **MVP Principle #1: Ship Fast, Learn Faster**
   - If a feature takes more than 2 days, it's too complex for MVP
   - Launch with 30% features that work vs 100% features half-built

2. **MVP Principle #2: Validate Before Building**
   - Don't add features users haven't requested
   - Use fake data or manual processes before automation

3. **MVP Principle #3: Simple Over Scalable**
   - Direct function calls over complex patterns
   - Single server over distributed systems
   - Basic UI over polished design

4. **MVP Principle #4: Core Loop Only**
   - For this MVP: Signup → Browse Events → Register → Access Library
   - Everything else is secondary

5. **MVP Principle #5: Technical Debt is OK**
   - Perfect code that ships late fails
   - Good-enough code that ships now wins
   - Refactor after validation, not before

### What This Means for TrafficMENA Hub MVP:

**DO for MVP:**
- Watch the simplified invitation flow (single + CSV); keep deferred CSV guidance visible and adjust daily limits if needed
- Keep the admin CRUD runbook (`docs/admin-content-workflow.md`) up to date as operators publish new content
- Provide lightweight dashboard metrics or remove the widget grid
- Add a smoke test for OTP login → event registration → library access
- Keep the UI simple and clearly communicate manual steps when automation is deferred

**DON'T for MVP:**
- Complete vertical slice migration
- Implement complex queueing systems
- Build elaborate invitation systems
- Add payment processing until validated
- Over-engineer for scale

**Remember:** Every line of code written for this MVP should directly serve user validation. If it doesn't help validate the business model, it shouldn't be in the MVP.

---

## 📁 Feature-Specific Documentation

**IMPORTANT:** Each feature has its own detailed CLAUDE.md file with MVP-specific guidance:

### Feature Documentation Files:

1. **📚 `/src/features/library/CLAUDE.md`**
   - Status: 80% functional - needs 30-minute query fix
   - MVP Action: Fix missing fields in query

2. **📅 `/src/features/events/CLAUDE.md`**
   - Status: 70% functional - needs 2-3 days of simplification
   - MVP Action: Remove duplicate fields, add pagination

3. **💳 `/src/features/products/CLAUDE.md`** *(retired)*
   - Status: Removed 2025-09 alongside products feature deprecation
   - MVP Action: None — commerce functionality deferred until post-validation

4. **✉️ `/src/features/invitations/CLAUDE.md`**
   - Status: Legacy implementation archived; lean `/api/invitations` + SPA hooks now power MVP
   - MVP Action: Build on the new Hono endpoints; keep CSV/batch work deferred

5. **👥 `/src/features/users/CLAUDE.md`**
   - Status: Appropriately scoped for MVP
   - MVP Action: Keep as-is, good MVP restraint

6. **💎 `/src/features/subscriptions/CLAUDE.md`** *(retired)*
   - Status: Removed 2025-09 — subscription flows no longer in codebase
   - MVP Action: Offer free access; plan future memberships separately

**When working on any feature, ALWAYS check its specific CLAUDE.md file first for detailed MVP guidance and current status.**

---

## Part 2: Current Feature Architecture (Vertical Slice Implementation)

### Vertical Slice Architecture Progress

**✅ Completed Migrations (Excellent Patterns):**
- **Events Feature**: Complete vertical slice with integrated business logic
- **Invitations Feature**: Modern implementation from start
- **Auth System**: Robust with comprehensive error handling

**🔄 In-Progress Migrations:**
- **Products Feature**: Removed for MVP simplification (catalog + payments deferred)
- **Library Feature**: Structure exists, component consolidation pending
- **Users Feature**: Service layer complete, UI components need alignment

**📋 Legacy Components Remaining:**
- `/src/components/ProductCard.tsx` - Needs integration with service layer
- `/src/pages/Products.tsx` - Good transitional pattern (re-export)
- Mixed route terminology (`/meetups` vs `/events`) needs standardization

### Feature Structure Template (Current Standard)

```
src/features/[feature-name]/
├── components/          # Feature-specific UI components
│   ├── [FeatureCard].tsx      # Main display component
│   ├── [FeatureModal].tsx     # Action modals
│   └── index.ts               # Clean exports
├── pages/              # All pages related to this feature
│   ├── [PublicPage].tsx       # Public-facing pages
│   ├── [DashboardPage].tsx    # User dashboard pages
│   └── admin/                 # Admin pages
│       ├── [AdminList].tsx    # List/management view
│       ├── new.tsx            # Creation form
│       └── edit.tsx           # Edit form
├── hooks/              # Feature-specific hooks
│   ├── use[Feature].ts        # General CRUD operations
│   └── use[Feature][Action].ts # Specific actions
├── services/           # Business logic services (Singleton pattern)
│   ├── [Feature]Service.ts         # Main service class
│   └── [Feature][Action]Service.ts # Action-specific services
├── types/              # Feature-specific TypeScript types
│   └── index.ts        # All types for this feature
└── index.ts            # Clean exports for the feature
```

### Cross-Feature Integration Patterns

**Service Layer Coordination (Current Pattern):**
```typescript
// Singleton service pattern consuming the Hono API client
export class EventService {
  private static instance: EventService;

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  async createEvent(eventData: CreateEventData) {
    const response = await apiClient.post('/api/events', eventData);
    if (!response.success) throw AppErrorHandler.handleApiError(response.error);

    // Trigger library asset linkage
    await LibraryService.getInstance().linkEventAssets(response.data.id);

    return response;
  }
}
```

### Critical Inter-Feature Dependencies (Hidden Relationships)

**🔄 Cross-Feature Workflows (Need Orchestration):**
1. **User Journey Pipeline**: Invitation → Registration → Event Attendance → Library Access → Skill Development
2. **Expert Growth Loop**: Event Attendees → Library Contributors → Expert Speakers → New Events
3. **Content Intelligence**: Event Topics → Library Curation → Usage Analytics → Event Planning
4. **Access Control Matrix**: Subscription Status → Library Access → Event Participation → Product Recommendations

**🎯 Missing Orchestration Services:**
- **Recommendation Engine**: Cross-feature data utilization for personalization
- **Workflow Coordinator**: Multi-step business processes spanning features  
- **Analytics Aggregator**: Platform-wide intelligence and insights
- **Notification Orchestrator**: Cross-feature communication and alerts

---

## Part 3: Database Architecture & Security

### Database Schema (Comprehensive Implementation)

**Core Tables with Strong Relationships:**
```sql
-- Event management with foreign key constraints
events (id, title, description, date, guest_experts JSONB, type enum)
event_attendees (event_id FK, user_id FK, attendance_status)

-- User profiles with audit trails
profiles (id, role enum DEFAULT 'user', subscription_status, onboarding_data)
user_skills (user_id FK, skill_id FK, proficiency_level)
profile_access_log (user_id FK, action, ip_address, timestamp)

-- Library with access controls
library_assets (id, event_id FK, content_type, usage_stats)

-- Invitation system (4-table structure)
invitations (id, batch_id FK, email, status, token)
invitation_batches (id, created_by FK, total_count, processed_count)
invitation_queue (invitation_id FK, scheduled_for, retry_count)
- (Removed) invitation_events (legacy telemetry table; MVP now logs invite state changes on the invitations row itself)

-- Products and subscriptions
products (id, name, price, currency, metadata JSONB)
subscriptions (user_id FK, product_id FK, status, payment_data JSONB)
```

**Security Implementation (MVP-Appropriate):**
- **Row Level Security** policies on essential tables
- **Basic privilege management** for MVP needs
- **Simple audit logging** for critical actions only
- **Input validation** with basic sanitization
- **Role-based access control** simplified for MVP scale

### Critical Security Measures

**Authentication & Authorization:**
```typescript
// Secure session management
const { user, session, loading, signOut } = useAuth();

// Route protection with role checking
<AdminProtectedRoute>
  <AdminDashboard />
</AdminProtectedRoute>
```

**Input Sanitization (Comprehensive):**
```typescript
// SQL injection prevention
export const sanitizeSearchQuery = (input: string): ValidationResult => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
    /[';]--/, /\/\*[\s\S]*?\*\//, /\bOR\b.*\b1\s*=\s*1\b/i
    // + 10 more patterns for comprehensive protection
  ];
  // Returns sanitized value or validation error
};
```

**Content Security Policy (Production-Ready):**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  frame-src 'self' https://www.youtube.com https://player.vimeo.com [+15 more];
  connect-src 'self' https://api.trafficmena.com http://localhost:3001;
"/>
```

---

## Part 4: Development Standards & Code Quality

### Code Quality Assessment (Current State)

**Overall Score: B+ (83/100)**

**✅ Strengths for MVP:**
- Zero diagnostic errors across entire codebase
- Good TypeScript implementation suitable for MVP
- Basic error handling with `AppErrorHandler` class
- Service layer patterns (consider simplifying singletons for MVP)
- Modern React patterns with proper hook usage
- MVP-appropriate security implementations

**🔄 Areas for Improvement:**
- Complete vertical slice architecture migration (25% remaining)
- Implement route-based code splitting for performance
- Standardize route terminology (`/events` vs `/meetups`)
- Add comprehensive test suite

### Current Coding Conventions

**TypeScript Configuration (Relaxed for Rapid Development):**
```typescript
// tsconfig.json - Optimized for development speed
{
  "compilerOptions": {
    "noImplicitAny": false,        // Allows rapid prototyping
    "strictNullChecks": false,     // Reduces type ceremony
    "strict": false                // Balanced type safety
  }
}
```

**Import Organization (Auto-managed by Ultracite):**
```typescript
// 1. Builtin modules
import React from 'react';
// 2. External packages  
import { useQuery } from '@tanstack/react-query';
// 3. Internal modules (@/ imports)
import { Button } from '@/shared/components/ui/button';
// 4. Relative imports
import { EventCard } from '../components/EventCard';
```

**Error Handling Standard (Consistently Applied):**
```typescript
import { useErrorHandler } from '@/shared/utils/errorHandling';
import { API_BASE, fetchJson } from '@/app/api/client';

const { handleError } = useErrorHandler();

try {
  const data = await fetchJson<ApiResponse>(`${API_BASE}/events`);
  // Success handling with `data`
} catch (error) {
  handleError(error);
}
```

### Ultracite Configuration (Production-Ready)

**Code Quality Tools - Zero Configuration:**
- **Performance**: 10-100x faster than ESLint/Prettier
- **Integration**: Automatic import organization and formatting
- **Standards**: Comprehensive linting with React/TypeScript best practices
- **Security**: Built-in security rule enforcement

**Key Enforcement Rules:**
- Accessibility-first development (20+ a11y rules)
- React best practices (proper hook dependencies, key props)
- TypeScript optimization (proper type usage patterns)
- Security patterns (XSS prevention, input validation)

---

## Part 5: UI/UX Implementation & Design System

### Design System Implementation

**Color Palette (MENA-Optimized):**
```css
/* Brand Colors */
--primary: #101010; /* Ebony Black */
--primary-green: #05ef62; /* Brand Green */
--primary-gradient: #29cf9f; /* Green Gradient End */
--primary-white: #ffffff; /* Pure White */

/* Secondary Colors */
--secondary: #006681; /* Crystal Teal */  
--secondary-green: #20d68e; /* Caribbean Green */
--secondary-teal: #00fdc2; /* Bright Teal */

/* Semantic Colors */
--success: #05ef62; --warning: #f59e0b; --error: #ef4444; --info: #3b82f6;
```

**Component Library (50+ Components):**
- **Base Components**: 20+ Radix UI primitives properly implemented
- **Layout Components**: Responsive header, footer, navigation
- **Dashboard Components**: Metrics, charts, data visualization
- **Form Components**: Multi-step forms with validation
- **Content Components**: Rich text editor, media embeds, file uploads

### TipTap Editor Integration (Advanced Implementation)

**Features Implemented:**
- **Custom Nodes**: Image upload with validation, code blocks, headings
- **Extensions**: Typography, text alignment, highlighting, lists
- **Mobile-Responsive**: Adaptive toolbar and cursor visibility handling
- **Security**: File size limits, content sanitization, XSS prevention
- **Storage**: Rich text image uploads share the BunnyCDN pipeline (20 MB limit)

**Performance Optimizations:**
```typescript
// Mobile-responsive editor with optimal performance
const editor = useEditor({
  immediatelyRender: false, // Performance boost
  extensions: [
    StarterKit, Highlight, Subscript, Superscript, 
    TextAlign, Typography, ImageUpload.configure({
      maxFileSize: MAX_FILE_SIZE,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
    })
  ]
});
```

### Responsive Design Implementation

**Mobile-First Approach:**
- All components implement responsive design patterns
- Mobile-optimized navigation and interactions
- Proper touch targets and accessibility support
- Progressive enhancement for desktop features

---

## Part 6: MENA-Specific Implementation

### Regional Compliance & Localization

**Payment Integration (MENA-Focused):**
- **Paymob**: Primary MENA payment gateway
- **Fawaterk**: Saudi Arabia focused payments
- **Paytab**: Multi-country MENA support  
- **Currency Support**: Multi-currency with regional preferences

**Cultural Considerations (Implemented):**
- **Language Support**: Arabic/English content handling
- **Time Zone Handling**: MENA time zone optimization for events
- **Content Guidelines**: Cultural sensitivity in content management
- **Privacy Compliance**: GDPR-compliant with MENA considerations

### MENA Market Features

**Professional Networking Focus:**
- Expert speaker management for local industry leaders
- Industry-specific skill tracking relevant to MENA market
- Event types suited for professional development culture
- Content curation for regional marketing practices

---

## Part 7: Security Implementation (MVP-Appropriate)

### Multi-Layer Security Architecture

**Database Security:**
```sql
-- RLS policy example (applied to all tables)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles  
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
```

**Application Security:**
```typescript
// Comprehensive input sanitization
export const validateAndSanitizeSkillName = (input: string): ValidationResult => {
  const maliciousPatterns = [
    /<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i,
    /eval\s*\(/i, /expression\s*\(/i
  ];
  // Returns validation result with sanitized value
};
```

**Infrastructure Security:**
- **CSP Headers**: Comprehensive content security policy
- **HTTPS Enforcement**: Strict transport security
- **CORS Configuration**: Proper origin validation
- **Environment Variables**: Secure secrets management

### Audit & Monitoring

**Comprehensive Audit Trails:**
- **profile_access_log**: All user access with IP tracking
- **invitation_events**: (Removed for MVP simplicity; rely on invitations table timestamps)
- **Payment audit logs**: Transaction security monitoring
- **Content access logs**: Library usage and security events

---

## Part 8: Performance & Optimization

### Current Performance Status

**Frontend Performance:**
- **Build Time**: Optimized with Vite + SWC compiler
- **Bundle Size**: Not yet optimized (needs code splitting)
- **Runtime Performance**: Zero diagnostic errors, optimal React patterns
- **Caching Strategy**: TanStack Query with 5-minute stale time

**Backend Performance:**
- **Database Queries**: Drizzle targets indexed tables with selective field selection
- **Caching**: TanStack Query caching on the SPA; consider server-side caching for heavy admin analytics
- **Queue Processing**: Invitation single-send/CSV handled by `/api/invitations`; larger batch tooling remains deferred for MVP
- **Connection Management**: Drizzle uses the Node Postgres pool; introduce pgBouncer on the VPS if load increases

### Optimization Opportunities

**Immediate Performance Wins:**
1. **Route-based code splitting**: Implement lazy loading for admin routes
2. **Bundle analysis**: Add webpack-bundle-analyzer equivalent
3. **Image optimization**: Implement responsive image loading
4. **Database query optimization**: Add selective field querying

---

## Part 9: Migration Completion Strategy

### Priority Tasks (Post-Migration)

**High Priority:**
1. **Finish Invitation Activation Loop**
   - Convert accepted invites into Better Auth users, issue sessions, and log inviter metadata
   - Confirm acceptance from onboarding and reflect completion status in the admin dashboard
   - Document CSV/bulk import as post-MVP scope

2. **Admin Content Workflow**
   - Dashboard create/edit/delete flows are live; keep the `docs/admin-content-workflow.md` runbook fresh and watch for operator friction

3. **Dashboard Metrics Decision**
   - Provide a lightweight `/api/admin/metrics` endpoint or retire the metric grid to avoid stale UI

**Medium Priority:**
1. **Introduce request/error logging and basic monitoring on Hono**
2. **Add a Playwright/ Cypress smoke test for OTP → event registration → library access**
3. **Document deployment runbook (systemd, Caddy, backups)**

### Architecture Principles for Completion

**Maintain Vertical Slice Integrity:**
- Keep feature boundaries clear while enabling cross-feature coordination
- Use service layer for business logic that spans features
- Implement shared utilities for common functionality

**Preserve Security Standards:**
- All new features must implement input sanitization
- Maintain audit logging for new capabilities
- Follow established RLS policy patterns

---

## Part 10: Development Commands & Workflow

### Essential Commands

**Development Workflow:**
```bash
npm run dev          # Development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build with source maps
npm run preview      # Preview production build
```

**Code Quality (Ultracite):**
```bash
npm run lint         # Check for issues without fixing
npm run format       # Format and fix all files
npx ultracite check  # Comprehensive code quality check
```

**Database Operations:**
```bash
npm run db:reset                     # Reset the project-scoped local Postgres instance
npm --prefix server run db:migrate   # Apply Drizzle migrations to the active database
npm run db:status                    # Verify local Postgres status
```

### Quality Assurance Workflow

**CRITICAL: Always run before completing tasks:**
1. `mcp__ide__getDiagnostics` - Check for any linting/type errors
2. Fix all diagnostic errors before considering task complete
3. Run format command to ensure consistent code style
4. Verify all tests pass (when test suite is implemented)

### Git Workflow Standards

**Commit Standards:**
- Add and commit automatically when entire task is finished
- Use descriptive commit messages capturing full scope of changes
- Include security fixes and architectural changes in commit messages

**Branch Strategy:**
- Main branch: `main`
- Feature branches: Use descriptive names
- Always create PR for significant changes

---

## Part 11: Environment & Configuration

### Environment Variables (Required)

**Critical Setup:**
```bash
# server/.env (copy server/.env.example and update)
PGHOST=127.0.0.1
PGPORT=5433
PGUSER=trafficmena_app
PGPASSWORD=your_local_password
PGDATABASE=trafficmena_dev
BETTER_AUTH_SECRET=generate_a_32_char_secret
BETTER_AUTH_ISSUER=http://localhost:3001
CORS_ORIGIN=http://localhost:5173
PLUNK_API_KEY=your_plunk_key

# Frontend currently relies on Vite defaults; add VITE_API_BASE if you deploy behind a custom domain.
```

**Security Note:** Never commit `.env` files. Use `server/.env.example` as the canonical template and keep secrets in local-only `.env`.

### Build Configuration

**Vite Optimization (Current):**
```typescript
export default defineConfig({
  plugins: [react(), mode === 'development' && componentTagger()],
  build: { sourcemap: false },  // Production optimization
  css: { devSourcemap: false }   // Development performance
});
```

---

## Part 12: Testing & Documentation Strategy

### Testing Implementation (Planned)

**Test Categories Needed:**
1. **Unit Tests**: Service layer and utility functions
2. **Component Tests**: Feature component testing
3. **Integration Tests**: Cross-feature workflow testing
4. **Security Tests**: Input validation and access control
5. **Performance Tests**: Load testing for critical paths

### Documentation Standards

**Code Documentation:**
- TSDoc comments for all public functions
- Inline comments for complex business logic
- Architecture decision records (ADRs) for major changes

**API Documentation:**
- Hono route reference (`/api/auth/otp/*`, `/api/events`, `/api/library`, `/api/invitations`, `/api/users/me`)
- Service layer interface documentation
- Integration guide for external systems (Plunk, Better Auth, Hetzner deployment)

---

## Part 13: Compliance & Legal Considerations

### Data Protection Implementation

**GDPR Compliance Features:**
- **Data Access**: User profile access and export
- **Data Deletion**: Account deletion with cascade
- **Consent Management**: Opt-in for marketing communications
- **Audit Trails**: Complete user activity logging

**MENA Regional Compliance:**
- **Data Localization**: Regional data storage considerations
- **Payment Regulations**: Compliance with local payment laws
- **Content Regulations**: Cultural and legal content guidelines
- **Privacy Laws**: Adherence to regional privacy requirements

---

## Summary: Current MVP Platform Status

**TrafficMENA Hub MVP** represents a digital marketing education platform ready for rapid market validation with:

✅ **MVP-focused security** with essential protections in place
✅ **Modern architecture** (consider simplifying for MVP launch speed)
✅ **Zero diagnostic errors** and good code quality for MVP
✅ **Core feature set** for validating the education and events business model
✅ **MENA market focus** with regional considerations built-in

**REMEMBER: This is an MVP** - Every decision should prioritize:
1. Speed to market over perfection
2. User validation over feature completeness
3. Learning over scaling
4. Simplicity over complexity
5. Core features over nice-to-haves

**Next Phase Focus:**
🎯 Monitor the streamlined invitation flow (single + CSV), adjust guardrails if daily limits bite, and keep operator docs current
🎯 Keep the admin content workflow runbook current as operators seed events and assets
🎯 Deliver dashboard metrics replacement or retire the widget grid
🎯 Add smoke tests and production logging before VPS deployment

The platform demonstrates excellent technical leadership and architectural vision. With completion of the migration process and performance optimizations, this will be an exemplary React/TypeScript application serving the MENA digital marketing education market.

---

**Development Guidelines:**
- **Security First**: Never compromise on input validation or access controls
- **Performance Conscious**: Always consider mobile users and network constraints
- **User Experience**: Prioritize intuitive, accessible interfaces
- **Data Driven**: Leverage the extensive analytics capabilities for decision making
- **Community Focused**: Build features that strengthen the professional network effect

**Critical Reminders:**
- Always run diagnostics before completing any task
- Maintain the established error handling patterns
- Follow the vertical slice architecture for new features
- Preserve the comprehensive security implementations
- Document any architectural decisions or changes to this file

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
