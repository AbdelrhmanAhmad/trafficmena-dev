---
status: complete
priority: p2
issue_id: "022"
tags: [code-review, security, rate-limiting, auth]
dependencies: []
---

# Event Mode Rate Limit May Enable OTP Enumeration

## Problem Statement

When `eventMode` is enabled, the IP-based rate limit for OTP requests increases from 8 to 400 requests per 10 minutes. This 50x increase creates a significant attack surface for email enumeration attacks.

**Why it matters:** An attacker from a single IP can probe 400 email addresses in 10 minutes to determine which ones have accounts via response differences.

## Findings

### Security Sentinel Analysis

**Location:** `server/src/routes/api/auth.ts` (lines 15-19)

```typescript
const OTP_IP_LIMIT_DEFAULT = 8;
const OTP_IP_LIMIT_EVENT_MODE = 300; // Reduced from 400
const TURNSTILE_THRESHOLD = 20; // Require CAPTCHA after 20 requests
```

**Potential Impacts:**
- **Email Enumeration:** Probe 400 email addresses per 10 minutes from single IP
- **OTP Spam:** Trigger OTP emails to many users, exhausting email quotas
- **Reconnaissance:** Aid pre-attack credential stuffing campaigns

**Mitigating Factors:**
- Per-email rate limiting still applies (3 OTPs/10min, 10/day)
- Event mode is for controlled scenarios with shared WiFi
- Admin must manually enable/disable

## Proposed Solutions

### Solution 1: Reduce Event Mode Limit (Recommended)
- Lower from 400 to 50-100 requests
- **Pros:** Still handles large events (100 users on shared IP), reduces attack surface
- **Cons:** May hit limit with 200+ users on same corporate WiFi
- **Effort:** Small (1 line change)
- **Risk:** Low

### Solution 2: Add CAPTCHA After N Requests
- After 20-30 requests from same IP, require CAPTCHA
- **Pros:** Blocks automated attacks while allowing legitimate use
- **Cons:** Degrades UX at events, requires CAPTCHA integration
- **Effort:** Medium
- **Risk:** Low

### Solution 3: Auto-Expire Event Mode
- Add `eventModeExpiresAt` timestamp, auto-disable after X hours
- **Pros:** Prevents indefinite elevation, reduces attack window
- **Cons:** Admin may need to re-enable mid-event
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Consider **Solution 1** for immediate risk reduction - lower limit to 100 requests per 10 minutes. This accommodates most event scenarios while reducing enumeration potential by 4x.

## Technical Details

**Affected Files:**
- `server/src/routes/api/auth.ts`

**Testing:**
- Verify rate limit works in both modes
- Test with legitimate event traffic patterns

## Acceptance Criteria

- [ ] Event mode rate limit reconsidered and documented
- [ ] OR additional protection (CAPTCHA/monitoring) added
- [ ] Change logged and monitoring added when eventMode is toggled

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-22 | Created from code review | Event mode is legitimate feature for shared WiFi at events |
| 2026-01-23 | **FIXED:** Implemented Solution 1 + 2 | Event mode limit reduced to 300/10min. Cloudflare Turnstile CAPTCHA required for all event-mode requests OR after 20 requests threshold |

## Resources

- Branch: `important_migrations_deep_check`
- Security Sentinel Agent Report
- OWASP Enumeration Prevention Guidelines
