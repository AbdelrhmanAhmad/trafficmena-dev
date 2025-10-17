# Tests Directory

This directory is reserved for **proper test suites** using modern testing frameworks like Jest, Vitest, or Cypress.

## 🎯 Purpose

The `/tests/` directory is intentionally kept clean and ready for:
- **Unit Tests** - Component and function testing
- **Integration Tests** - API and service integration testing  
- **E2E Tests** - End-to-end user workflow testing
- **Performance Tests** - Load and performance testing

## 📋 Recommended Structure

When implementing proper tests, follow this structure:

```
tests/
├── unit/                 # Unit tests for components and utilities
│   ├── components/       # React component tests
│   ├── hooks/           # Custom hook tests
│   └── utils/           # Utility function tests
├── integration/         # API and service integration tests
│   ├── auth/           # Authentication flow tests
│   ├── database/       # Database operation tests
│   └── api/            # API endpoint tests
├── e2e/                # End-to-end tests
│   ├── user-flows/     # Complete user journey tests
│   └── admin-flows/    # Admin workflow tests
├── __mocks__/          # Mock files for testing
└── setup/              # Test configuration and setup files
```

## 🔧 Recommended Testing Stack

### Unit & Integration Testing
- **Vitest** - Fast unit testing (recommended for Vite projects)
- **Jest** - Popular alternative with extensive ecosystem
- **React Testing Library** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking for tests

### E2E Testing  
- **Playwright** - Modern, fast, and reliable E2E testing
- **Cypress** - Popular alternative with great debugging tools

### Configuration Files (Future)
- `vitest.config.ts` or `jest.config.js`
- `playwright.config.ts` or `cypress.config.js`
- `test-utils.tsx` - Custom render functions and test utilities

## 📦 Package.json Scripts (Future)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui", 
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## 🗂️ What Was Moved

**Debugging and diagnostic scripts have been moved to:**
- `/docs/debugging/integration/` - Backend diagnostics and connection tests
- `/docs/debugging/library/` - Library feature debugging utilities
- `/docs/debugging/events/` - Event management debugging
- `/docs/debugging/manual-testing/` - HTML test pages and manual utilities

## 🚀 Getting Started

When ready to implement proper testing:

1. Choose your testing framework (Vitest recommended)
2. Install testing dependencies
3. Configure test setup files
4. Start with critical user flows
5. Add unit tests for complex business logic
6. Implement E2E tests for key workflows

## 📚 Related

- `/docs/debugging/` - Debugging utilities and diagnostic scripts
- `/scripts/` - Development and deployment utility scripts
- `/context/` - Essential project documentation

## 🚦 Upcoming Smoke Test

- Framework: Playwright (preferred) with TypeScript fixtures.
- Scenario: OTP login → invitation acceptance → event registration → library asset playback.
- Data Prep: use `npm run db:reset` followed by the manual seeding steps documented in _MVP-FIX-PLAN.md_.
- Output: store scripts under `tests/e2e/smoke/` once implemented; wire into CI before launch.
