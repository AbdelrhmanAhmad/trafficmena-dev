# TrafficMENA Hub

> Digital marketing education platform for the MENA region

Connect with practitioners—not professors—through expert-led events, structured learning tracks, and a community that helps you grow.

## Highlights

- **Event Management** — Create, browse, and register for marketing events
- **Knowledge Library** — Access educational content and resources
- **Learning Tracks** — E-commerce, AI for marketers, content & performance marketing
- **Marketing Calculators** — ROAS, MER, CAC, and 20+ professional tools
- **Premium Membership** — Advanced tracks, templates, and VIP access
- **Invite System** — Single and bulk CSV invitations with admin controls

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, TanStack Query |
| Backend | Hono, Node.js 20 |
| Database | PostgreSQL 17, Drizzle ORM |
| Auth | Better Auth (OTP-based) |
| Storage | BunnyCDN |
| Email | Plunk |
| Tooling | Ultracite (Biome), path aliases (`@/`) |

## Install

Prerequisites: Node.js 20+, npm

```sh
npm install
npm --prefix server install
```

## Setup

1. Copy environment file:

```sh
cp server/.env.example server/.env
```

2. Configure required variables in `server/.env`:

```sh
DATABASE_URL=postgresql://user:pass@localhost:5433/trafficmena_dev
BETTER_AUTH_SECRET=your-secret-min-32-chars
PLUNK_API_KEY=your-plunk-key
BUNNY_STORAGE_ZONE=your-zone
BUNNY_STORAGE_ACCESS_KEY=your-key
BUNNY_STORAGE_CDN_URL=https://your-cdn.b-cdn.net
```

3. Start local PostgreSQL and run migrations:

```sh
npm run db:start
npm --prefix server run db:migrate
```

## Usage

Run both servers in separate terminals:

```sh
# Terminal A — Backend (http://localhost:3001)
npm --prefix server run dev

# Terminal B — Frontend (http://localhost:8080)
npm run dev
```

Stop the local database:

```sh
npm run db:stop
```

## Project Structure

```
├── src/                    # React SPA
│   ├── app/               # API client, auth context, hooks
│   ├── features/          # Feature modules (events, library, subscribe)
│   ├── pages/             # Route pages
│   └── shared/            # Shared UI components
├── server/                # Hono API
│   ├── src/
│   │   ├── routes/api/    # API endpoints
│   │   ├── db/            # Drizzle schema
│   │   └── services/      # Business logic
│   └── drizzle/           # Migration files
├── local/postgres/        # Local DB scripts
└── docs/                  # Operational documentation
```

## Scripts

### Frontend (Root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Ultracite linter |
| `npm run format` | Format code |

### Backend (Server)

| Command | Description |
|---------|-------------|
| `npm --prefix server run dev` | Start Hono dev server |
| `npm --prefix server run build` | Compile TypeScript |
| `npm --prefix server run db:gen` | Generate Drizzle SQL |
| `npm --prefix server run db:migrate` | Apply migrations |
| `npm --prefix server run db:studio` | Open Drizzle Studio |

### Database (Local)

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start PostgreSQL on port 5433 |
| `npm run db:stop` | Stop PostgreSQL |
| `npm run db:status` | Health check |
| `npm run db:reset` | Reset database |
| `npm run db:psql` | Open psql shell |

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/otp/request` | Request OTP |
| `POST /api/auth/otp/verify` | Verify OTP, create session |
| `GET /api/events` | List events |
| `POST /api/events/:id/register` | Register for event |
| `GET /api/library` | List library assets |
| `POST /api/uploads` | Upload file (≤20MB) |
| `POST /api/invitations` | Single invite |
| `POST /api/invitations/csv` | Bulk CSV invite |

All endpoints are protected; payloads validated with Zod.

## RBAC Roles

```
owner > admin > manager > expert > user
```

| Role | Permissions |
|------|-------------|
| user | Browse events and library |
| expert | Co-host/author content |
| manager | CRUD events and library |
| admin | Full control (except owner removal) |
| owner | Full system control |

## Deployment

Single VPS setup:
- Ubuntu 22.04+ with systemd
- Caddy for TLS and reverse proxy
- Managed PostgreSQL (or promote local schema with SSL)

## Documentation

- [Admin Content Workflow](docs/admin-content-workflow.md)
- [RBAC Decision](docs/rbac-decision.md)

## License

Private — All rights reserved
