# TrafficMENA Hub

MVP digital marketing education platform for the MENA region. The core loop is: Signup → Browse Events → Register → Access Library. Built for fast iteration with a modern TypeScript stack.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI (Radix primitives), TanStack Query
- Backend API: Hono (Node 20 LTS)
- Auth: Better Auth (email OTP), Plunk (email delivery)
- Database: PostgreSQL 17.x with Drizzle ORM
- Tooling: Ultracite (Biome) for lint/format, path aliases (`@/`)
- Deployment (prod): Single VPS (Ubuntu + systemd + Caddy)

## Repository Structure

```
.
├── server/                 # Hono API (Better Auth + Drizzle + Postgres)
│   ├── src/
│   ├── package.json
│   └── .env.example        # Copy to .env for local dev
├── src/                    # React SPA
├── public/                 # Static assets
├── local/postgres/         # Project-scoped Postgres helper scripts
├── package.json            # SPA scripts + local DB scripts
└── README.md
```

## Getting Started (Local)

Prerequisites: Node.js 20+, npm; Postgres is managed locally via helper scripts (no Docker required).

1) Install dependencies

```
npm install
npm --prefix server install
```

2) Configure environment

```
cp server/.env.example server/.env
# Edit server/.env to match your local setup (secrets stay local)
```

3) Start local Postgres (project-scoped)

```
npm run db:start          # start local PG on 5433
npm run db:status         # optional health check
```

4) Apply database migrations

```
npm --prefix server run db:migrate
```

5) Run the dev servers (in two terminals)

```
# Terminal A (API)
npm --prefix server run dev   # Hono on http://localhost:3001

# Terminal B (SPA)
npm run dev                   # Vite on http://localhost:8080
```

To stop the local database:

```
npm run db:stop
```

## Available Scripts

Root (SPA):
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` / `npm run format` – code quality via Ultracite
- `npm run db:start|stop|status|psql|reset|health` – local Postgres helpers

Server (API):
- `npm --prefix server run dev` – start Hono with dotenv
- `npm --prefix server run build` – compile TypeScript
- `npm --prefix server run start` – run compiled server
- `npm --prefix server run db:gen` – generate Drizzle SQL
- `npm --prefix server run db:migrate` – apply migrations
- `npm --prefix server run db:studio` – open Drizzle Studio

## API Overview (MVP)

- `POST /api/auth/otp/request` – request OTP
- `POST /api/auth/otp/verify` – verify OTP, create session
- `GET /api/events` / `GET /api/events/:id`
- `POST /api/events/:id/register` / `POST /api/events/:id/cancel`
- `GET /api/library` / `GET /api/library/:id`
- `GET /api/users/me`
- `POST /api/invitations` (single) / `POST /api/invitations/csv` / `GET /api/invitations`

All endpoints are protected appropriately; payloads validated with Zod on the server.

## Development Notes

- Do not commit secrets. Use `server/.env` locally; share safe defaults via `server/.env.example`.
- The SPA talks only to the Hono API; legacy Supabase clients were removed.
- Prefer simple patterns over over-engineering—this is an MVP.

## Deployment (Brief)

- Single VPS (Ubuntu 22.04+), systemd service for the Hono server, Caddy for TLS and reverse proxy.
- Use managed Postgres or promote the local schema; enable SSL in production.

---

For day-to-day operator steps, see `docs/admin-content-workflow.md`. For architecture and migration notes, see `warp-reviewed-plan.md`.
