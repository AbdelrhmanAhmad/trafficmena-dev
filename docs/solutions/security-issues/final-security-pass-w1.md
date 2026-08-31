---
module: security
tags: [phase2, w1, final-pass]
problem_type: best_practice
---

# Phase 2 W1 — Final security pass (summary)

Branch: `phase2/security`

## Fixed in final pass

| ID | Fix |
|----|-----|
| TM-003 | Rate limit on `/invitations/:token/activate` (5/hr/IP) |
| TM-005 | Redact invitation paths in GTM `page_path`; remove token from signup UI |
| TM-009 | Admins cannot modify owner roles (aligned with delete guard) |
| TM-010 | Production fail-fast requires `DB_SSL=true` |
| TM-011 | Remove tracked PII CSV from tree; gitignore invite CSV patterns |
| TM-020 | Free checkout uses `registerFreeEventAttendee` with row lock + capacity + reservations |
| TM-021 | Rate limit on `/payments/price-preview` (30/10min/user) |
| TM-023 | Managers receive null email/phone in `/users` list |
| TM-024 | Public track endpoint returns only published child events |

## Deferred (do not block W1 merge)

| ID | Status | Workstream |
|----|--------|------------|
| TM-001 | Owner/production | Credential rotation + git history |
| TM-006 | Activity Hub | Server-side UGC sanitization |
| TM-007 | Infrastructure | Bunny signed URLs / entitlement revocation |
| TM-012 | Infrastructure | Static host HSTS/CSP headers (meta exists) |
| TM-014 | Phase 2 | Privileged-action audit logging |
| React Router v7 CVEs | W6 | TanStack Start migration |
| TM-010 CA verify | Infrastructure | `rejectUnauthorized` + CA bundle |

## Accepted risks

- Invitation token in email URL (high entropy, 72h TTL, no auto-session)
- In-memory rate limiter on single-instance deployment until Redis pass
- Public Bunny CDN URLs after prior legitimate access (TM-007)
