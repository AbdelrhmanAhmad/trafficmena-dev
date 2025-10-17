# Drizzle ORM Setup (server)

This project uses Drizzle ORM in the server package to manage the local, project-scoped PostgreSQL database.

What’s included
- Drizzle client: server/src/db/client.ts (uses node-postgres Pool and DATABASE_URL)
- Schema entry: server/src/db/schema/index.ts (start defining tables here)
- Drizzle config: server/drizzle.config.ts (uses server/.env)
- NPM scripts (server/package.json):
  - db:gen → Generate SQL migrations from schema
  - db:migrate → Apply migrations to the database
  - db:studio → Explore schema/data in a local web UI

Requirements
- server/.env with DATABASE_URL pointing to the local project-scoped DB (already created):
  DATABASE_URL=postgres://trafficmena:YOUR_PASSWORD@127.0.0.1:5433/trafficmena_dev

Usage
1) Define a table in server/src/db/schema/index.ts, for example:

```ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

2) Generate a migration (from server/):

npm run db:gen

3) Apply the migration:

npm run db:migrate

4) Connect in code:

```ts
import { db } from './src/db/client';
import { users } from './src/db/schema';

const rows = await db.select().from(users);
```

Notes
- Migrations are written to server/drizzle and should be committed to git.
- Use the local Postgres helpers (npm run db:* at repo root) to manage the DB process itself.
- Drizzle only manages schema and queries; it does not start/stop the Postgres server.
