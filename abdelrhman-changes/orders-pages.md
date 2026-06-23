# Orders — Admin & Member Pages

> **Author:** Abdelrhman (via Cursor)  
> **Date:** June 17, 2026  
> **Commit:** `f767461`  
> **Scope:** صفحة طلبات في لوحة الإدارة (مع إحصائيات الإيرادات) + صفحة «طلباتي» للعضو

---

## الملخص

تمت إضافة عرض قائمة الطلبات مع بنود كل طلب (Series / Digital Products) للإدارة وللعضو، فوق نظام الطلبات الموجود مسبقًا (`POST /orders`, الدفع عبر Fawaterk).

| الجهة | المسار | الوصف |
|-------|--------|--------|
| Admin / Manager | `/admin/orders` | كل طلبات المستخدمين + إحصائيات |
| Member | `/dashboard/orders` | طلبات المستخدم الحالي فقط |

---

## API (Backend)

**الملف:** `server/src/routes/api/orders.ts`

### Endpoints جديدة

| Method | Path | الصلاحية | الوصف |
|--------|------|----------|--------|
| GET | `/api/orders` | Auth (المستخدم الحالي) | قائمة طلباتي مع pagination وفلتر الحالة |
| GET | `/api/admin/orders` | owner / admin / manager | كل الطلبات + stats + pagination |

### Query params (كلا الـ endpoint)

| Param | القيم | الافتراضي |
|-------|-------|-----------|
| `page` | ≥ 1 | 1 |
| `pageSize` | 1–50 | 20 |
| `status` | `all` \| `pending` \| `paid` \| `failed` \| `expired` | `all` |

### استجابة Admin

```json
{
  "data": {
    "stats": {
      "totalOrders": 0,
      "paidOrders": 0,
      "pendingOrders": 0,
      "revenueCents": 0
    },
    "items": [
      {
        "id": "...",
        "userId": "...",
        "userEmail": "...",
        "userName": "...",
        "status": "paid",
        "totalCents": 50000,
        "currency": "EGP",
        "createdAt": "...",
        "paidAt": "...",
        "items": [
          {
            "itemType": "series",
            "title": "Series title",
            "lineTotalCents": 50000
          }
        ]
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 0 }
  }
}
```

### Helpers مشتركة

- `enrichOrderItems()` — يجلب عناوين Series و Digital Products دفعة واحدة (بدل N+1 queries)
- `loadItemsByOrderId()` — يجمّع البنود حسب `orderId`
- `GET /orders/:id` — يستخدم نفس `enrichOrderItems` بعد التعديل

### ملاحظة تقنية

- في `/admin/orders`: `totalRow` يُفك من `[[totalRow], ...]` → `totalRow?.value`
- في `/orders`: المصفوفة كاملة → `totalRow[0]?.value`

---

## Frontend

### API client

**الملف:** `src/app/api/orders.ts`

- `fetchMyOrders(params)` → `GET /api/orders`
- `fetchAdminOrders(params)` → `GET /api/admin/orders`
- أنواع: `Order`, `OrderItem`, `OrderWithItems`, `AdminOrderRecord`, `AdminOrdersStats`

### Hooks

**الملف:** `src/app/hooks/useOrders.ts`

- `useMyOrders(params)`
- `useAdminOrders(params)`
- `placeholderData: keepPreviousData` للتنقل بين الصفحات

### Components

| الملف | الوظيفة |
|-------|---------|
| `src/features/orders/components/OrderStatusBadge.tsx` | شارة الحالة (paid, pending, …) |
| `src/features/orders/components/OrderItemsList.tsx` | قائمة البنود + السعر |

### Pages

| الملف | المسار |
|-------|--------|
| `src/pages/admin/orders.tsx` | `/admin/orders` |
| `src/pages/dashboard/MyOrders.tsx` | `/dashboard/orders` |

**Admin UI:**

- 4 بطاقات إحصائية: Revenue (paid), Paid orders, Pending, All orders
- فلتر الحالة + pagination
- لكل طلب: المبلغ، اسم المستخدم، البريد، التاريخ، البنود

**Member UI:**

- بطاقة لكل طلب: المبلغ، التاريخ، الحالة، البنود
- فلتر الحالة + pagination

### Routes & Navigation

**الملف:** `src/App.tsx`

- Lazy routes: `AdminOrdersPage`, `MyOrdersPage`

**الملف:** `src/shared/components/layout/AppLayout.tsx`

- Member sidebar: **My Orders** → `/dashboard/orders` (أيقونة `Receipt`)
- Admin sidebar: **Orders** → `/admin/orders` (roles: owner, admin, manager)

---

## اختبار يدوي

1. سجّل دخول كعضو → اشترِ Series أو Digital Product → `/dashboard/orders` — يظهر الطلب والبنود
2. سجّل دخول كـ manager+ → `/admin/orders` — تظهر الإحصائيات وطلبات كل المستخدمين
3. جرّب فلتر `pending` / `paid` والتنقل بين الصفحات

---

## ملفات معدّلة / مضافة

```
server/src/routes/api/orders.ts
src/app/api/orders.ts
src/app/hooks/useOrders.ts
src/features/orders/components/OrderItemsList.tsx
src/features/orders/components/OrderStatusBadge.tsx
src/pages/admin/orders.tsx
src/pages/dashboard/MyOrders.tsx
src/App.tsx
src/shared/components/layout/AppLayout.tsx
```
