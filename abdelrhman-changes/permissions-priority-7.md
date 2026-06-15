# Permissions — Priority 7 (Tasks 24–27)

## Summary

Role-based access for Phase 1 commerce and masterclasses content. **Manager** can create/edit; **Admin/Owner** can also delete, issue/revoke certificates, and manage certificate design.

## Roles

| Role | Phase 1 access |
|------|----------------|
| **User** | Browse/buy Series, Digital Products, Masterclasses; watch purchased content; complete lessons; view own certificates |
| **Expert** | Display-only (no admin panel; same as user for content) |
| **Manager** | Admin panel: create/edit Series sales, Digital Products, Masterclasses (modules, lessons, videos, files); manual masterclass enrollment; view completion progress |
| **Admin / Owner** | Everything Manager + **delete** content, **manual certificate issue/revoke**, **global certificate settings**, user management |

## Backend guards

| Helper | Roles |
|--------|-------|
| `requireManager` | owner, admin, manager |
| `requireAdmin` | owner, admin |
| `requireContentDelete` | owner, admin (alias of requireAdmin) |

### Delete endpoints (Admin/Owner only)

- `DELETE /masterclasses/:id` and curriculum deletes (modules, lessons, videos, files)
- `DELETE /digital-products/:id` and product files
- `DELETE /certificates/:id` — remove learner certificate (allows re-issue)
- `DELETE /series/:id`, `/library/:id`, `/tracks/:id`, `/events/:id` — already admin-only

### Certificate admin (Admin/Owner only)

- Global/per-masterclass certificate settings
- Manual issue
- **DELETE certificate** — hard delete record + best-effort PDF removal from Bunny

### Manager-visible data

- `GET /masterclasses/:id/enrollments` now includes `completedLessons`, `totalLessons`, `isComplete` per enrolled user

## Frontend

- `useRolePermissions()` — `canManageContent` (manager+), `canDeleteContent` (admin+)
- Masterclass / Digital Product delete buttons hidden for managers
- Curriculum & file delete controls disabled for managers
- Certificates tab remains **Admin/Owner only**; enrollments tab shows progress for managers

## Certificate revoke flow

1. Admin opens Masterclass → **Certificates** tab
2. Clicks **Remove** (trash) on issued certificate
3. Record deleted from DB; learner sees locked certificate again until re-completion or manual issue

## Manual test checklist

- [ ] Manager can edit masterclass curriculum but cannot delete module/lesson/file/video (UI disabled + API 403)
- [ ] Admin can delete masterclass / digital product
- [ ] Manager cannot access `/admin/certificate-settings`
- [ ] Admin can issue and **remove** certificate; learner can receive new certificate after removal
- [ ] Manager sees lesson progress on Enrollments tab
- [ ] Regular user can browse, buy, learn, view certificate — no admin routes

## Files changed

**Backend:** `utils.ts`, `certificates.ts`, `certificateStorage.ts`, `routes/api/certificates.ts`, `masterclasses.ts`, `digitalProducts.ts`

**Frontend:** `MasterclassCertificatesAdmin.tsx`, `useCertificates.ts`, masterclass/digital-product admin pages, curriculum/file CRUD components, `MasterclassManualEnrollment.tsx`, `library/[id].tsx`
