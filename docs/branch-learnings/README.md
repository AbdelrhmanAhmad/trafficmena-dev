# Branch Learnings

This directory contains institutional knowledge extracted from the solutions documentation for specific branches. Each file helps prevent knowledge loss when a branch introduces significant patterns or changes.

## Current Branch Learnings

### codex/legacy-members-fixes

The `codex/legacy-members-fixes` branch introduces 10 major features for managing legacy members and subscriptions. The branch demonstrates strong alignment with documented database safety, security, and testing patterns.

**Start here:**
1. Read [Institutional Learnings](./codex-legacy-members-fixes-institutional-learnings.md) for the full analysis
2. Use [Solution Mapping](./codex-legacy-members-solution-mapping.md) to quickly understand which documentation applies to each change
3. Review the code review checklist before merging

**Key insights:**
- All multi-table operations use atomic transactions ✓
- Rate limiting keyed by user ID (not IP) for security ✓
- JSON payloads limited with streaming reader ✓
- Database migrations use idempotent constraint patterns ✓
- Tests follow bug-first workflow ✓

## Structure

Each branch learns document contains:

### Institutional Learnings File
- **Purpose**: Comprehensive analysis of which documented solutions apply
- **Contents**:
  - Search context and findings
  - Critical patterns (always check)
  - 8-9 relevant learnings with branch applicability
  - 7 key patterns demonstrated in the code
  - Pre-merge checklist and potential gaps
- **Audience**: Code reviewers, future maintainers

### Solution Mapping File
- **Purpose**: Quick reference showing which solution documents apply to which code changes
- **Contents**:
  - File-by-file mapping of changes to solution documents
  - Code examples showing pattern implementation
  - Cross-reference table
  - Code review checklist
- **Audience**: Developers implementing similar features, code reviewers

## Files in This Directory

- `README.md` - This file
- `codex-legacy-members-fixes-institutional-learnings.md` - Full analysis
- `codex-legacy-members-solution-mapping.md` - Quick reference mapping

## How to Use

### When Reviewing PRs
Use the **Solution Mapping** file to understand:
- Which documented patterns should be present
- What code examples should look like
- Which tests should verify behavior

### When Implementing Similar Features
Use the **Institutional Learnings** file to:
- Understand root causes of patterns
- Learn from past mistakes
- Plan your implementation with confidence

### When Writing Documentation
Reference these files when creating new solution documents to:
- Understand the style and format
- See how patterns are documented
- Learn what other engineers need to know

## Solution Documents Used

The analysis references these solution documents:

**Database Safety**
- `docs/solutions/database-issues/drizzle-transaction-atomicity.md`
- `docs/solutions/database-safety-patterns.md`

**Security**
- `docs/solutions/security-issues/pre-launch-security-hardening.md`
- `docs/solutions/security-issues/like-pattern-sql-injection.md`

**Features**
- `docs/solutions/feature-implementations/payment-gateway-lessons-learned.md`
- `docs/solutions/feature-implementations/track-booking-grants-event-access.md`
- `docs/solutions/feature-implementations/event-cancellation-system.md`

**Payment System**
- `docs/solutions/payment-gateway/payment-gateway-mvp-compound-analysis.md`

**Testing**
- `docs/solutions/development-practices/bug-first-testing-workflow.md`

## Contributing

When you complete work on a branch with significant patterns:

1. Run the institutional knowledge search (see CLAUDE.md)
2. Create `[branch-name]-institutional-learnings.md`
3. Create `[branch-name]-solution-mapping.md`
4. Commit to the main branch so future work references these lessons

## Questions?

If a pattern isn't clear:
1. Check the solution mapping for the exact location in the branch
2. Read the referenced solution document
3. Look at the code example in the solution mapping
4. Ask the team - document the answer as a PR comment for future reference
