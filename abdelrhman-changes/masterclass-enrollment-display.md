# Masterclass admin — enrollment display (phone & purchase price)

## Overview

In **Admin → Masterclass → Enrollments** and **Certificates → Enrolled learners**, each row now shows:

1. Name, email
2. **Phone number** (from `profiles.phone_number`, or `—` if missing)
3. **Source badge:** `paid` | `manual`
4. **Purchase price badge** (paid enrollments only): amount from linked payment (`payments.amount_cents`), formatted e.g. `500 EGP` or `Free`

Manual enrollments do not show a price badge (no `payment_id`).

## Why

- Contact learners from admin without opening Users
- See the **price paid at checkout** even if the masterclass list price changes later

## API changes

### `GET /api/masterclasses/:id/enrollments`

Added fields on each item:

- `phoneNumber`
- `purchasedPriceInCents` (from `LEFT JOIN payments` on `masterclass_enrollments.payment_id`)

### Certificates admin list

`listMasterclassCertificateAdminRows` in `server/src/services/certificates.ts` — same fields.

## Frontend

| File | Role |
|------|------|
| `MasterclassEnrolledLearnerDetails.tsx` | Shared name / email / phone / badges |
| `MasterclassManualEnrollment.tsx` | Enrollments tab list |
| `MasterclassCertificatesAdmin.tsx` | Enrolled learners under Certificates |

Types: `MasterclassEnrollment`, `MasterclassCertificateAdminRow` — `phoneNumber`, `purchasedPriceInCents`.
