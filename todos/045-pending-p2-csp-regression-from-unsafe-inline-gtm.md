---
status: pending
priority: p2
issue_id: "045"
tags: [code-review, security, analytics, csp]
dependencies: []
---

# Remove The CSP Regression Introduced For GTM

## Problem Statement

To support the GTM bootstrap snippet, the change set adds `'unsafe-inline'` to `script-src` in both the HTML shell and server-side CSP. That materially weakens one of the app's main XSS defense-in-depth controls across the entire product.

## Findings

- The HTML shell CSP now allows inline script execution globally.
- The server CSP mirrors the same relaxation, so production requests inherit it as well.
- The only new inline script need is GTM/dataLayer initialization, which can typically be handled with a nonce, hash, or a tighter dedicated bootstrap strategy.

## Proposed Solutions

### Option 1: Replace inline allowance with nonce or hash-based bootstrap

**Approach:** Keep the GTM bootstrap snippet but authorize it with a nonce or static hash rather than enabling all inline scripts.

**Pros:**
- Preserves CSP protection while supporting GTM.
- Keeps the security model closest to the current hardened baseline.

**Cons:**
- Requires slightly more setup around how the snippet is rendered.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Move bootstrap logic into a static external script

**Approach:** Serve the dataLayer/GTM bootstrap from a first-party script file already allowed by CSP.

**Pros:**
- Avoids inline script entirely.
- Simple mental model once in place.

**Cons:**
- Still needs care around script ordering before GTM loads.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `index.html:8-15,47-50`
- `server/src/app.ts:32-39`

## Resources

- `index.html`
- `server/src/app.ts`
- `docs/solutions/security-issues/pre-launch-security-hardening.md:45`

## Acceptance Criteria

- [ ] GTM still initializes correctly.
- [ ] The app no longer requires `script-src 'unsafe-inline'` in production CSP.
- [ ] Security review confirms no net regression in script execution policy.

## Work Log

### 2026-04-15 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed the HTML and server CSP deltas alongside the GTM bootstrap changes.
- Cross-checked the change against the repo's existing security-hardening posture.

**Learnings:**
- This is a deliberate trade-off in the current patch, but it is broader than the GTM use case requires.

