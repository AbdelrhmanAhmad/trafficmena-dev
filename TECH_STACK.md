# TrafficMENA Tech Stack

> Last updated: January 1, 2026

## Frontend (React SPA)

| Category | Technology | Version |
|----------|------------|---------|
| **Runtime** | React | `^18.3.1` |
| **Bundler** | Vite | `^7.1.5` |
| **Language** | TypeScript | `^5.5.3` |
| **Routing** | react-router-dom | `^6.26.2` |
| **Styling** | TailwindCSS | `^3.4.11` |
| **UI Library** | Radix UI | Various `^1.x` - `^2.x` |
| **Animations** | tailwindcss-animate | `^1.0.7` |
| **Form Handling** | react-hook-form | `^7.53.0` |
| **Validation** | Zod | `^3.23.8` |
| **Server State** | TanStack Query | `^5.56.2` |
| **Rich Text Editor** | TipTap | `^3.8.0` |
| **Charts** | Recharts | `^2.12.7` |
| **Date Handling** | date-fns | `^3.6.0` |
| **Toasts** | Sonner | `^1.5.0` |
| **Icons** | lucide-react | `^0.462.0` |
| **Linting/Formatting** | Ultracite (Biome) | `^5.2.4` / `^2.2.0` |

---

## Backend (Hono API)

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Hono | `^4.10.3` |
| **Node Adapter** | @hono/node-server | `^1.19.5` |
| **Language** | TypeScript | `^5.5.3` |
| **ORM** | Drizzle ORM | `^0.44.6` |
| **Database Driver** | pg | `^8.11.3` |
| **Auth** | Better Auth | `^1.3.26` |
| **Validation** | Zod | `^3.23.8` |
| **Dev Runner** | tsx | `^4.19.1` |
| **Migrations** | drizzle-kit | `^0.31.5` |

---

## Database

| Technology | Version |
|------------|---------|
| PostgreSQL | `17.x` |

> Project-scoped local Postgres (no Docker required)

---

## Key Tooling

| Tool | Purpose | Version |
|------|---------|---------|
| Node.js | Runtime | `20.x` |
| npm | Package Manager | - |
| Ultracite | Linting/Formatting | `^5.2.4` |
| PostCSS | CSS Processing | `^8.4.47` |
| Autoprefixer | CSS Vendor Prefixes | `^10.4.20` |
| Shadcn CLI | UI Component Generator | `^3.2.1` |

---

## Architecture Overview

```
├── src/                    # React SPA (Vite + React 18 + TypeScript)
│   ├── app/               # API client layer, auth context, hooks
│   ├── features/          # Feature modules (events, library)
│   ├── pages/             # Route pages
│   └── shared/            # Shared UI components (Shadcn/Radix)
│
└── server/                # Hono API (Node 20)
    ├── src/
    │   ├── routes/api/    # API route handlers
    │   ├── db/            # Drizzle client + schema
    │   ├── services/      # Business logic
    │   └── auth/          # Better Auth config
    └── drizzle/           # Migration SQL files
```

---

## External Services

| Service | Purpose |
|---------|---------|
| Plunk | Email delivery (OTP) |
| BunnyCDN | File storage & CDN |


