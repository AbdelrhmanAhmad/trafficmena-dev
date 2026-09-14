import { config } from 'dotenv';
import pg from 'pg';

config();
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const tables = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ecd_%'`,
);
console.log('tables', tables.rows);

const sql = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('../drizzle/0033_ecd_html_checkout.sql', import.meta.url), 'utf8'),
);

if (tables.rows.length === 0) {
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    console.log('running', statement.slice(0, 60).replace(/\s+/g, ' '), '...');
    await client.query(statement);
  }
  console.log('applied 0033 manually');
} else {
  console.log('ECD tables already present');
}

const after = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ecd_%'`,
);
console.log('after', after.rows);
await client.end();
