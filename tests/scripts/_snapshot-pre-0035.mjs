import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'server/package.json'));
const pg = require('pg');

function loadDatabaseUrl() {
  const env = readFileSync(join(root, 'server/.env'), 'utf8');
  const dbLine = env.split('\n').find((line) => line.startsWith('DATABASE_URL=') && !line.trim().startsWith('#'));
  if (!dbLine) throw new Error('DATABASE_URL not found in server/.env');
  return dbLine.split('=').slice(1).join('=').trim();
}

const url = loadDatabaseUrl();
const parsed = new URL(url);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
  throw new Error(`Refusing non-local host: ${parsed.hostname}`);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const snapshot = await client.query(`
  SELECT id, title, event_description, location, guest_experts
  FROM events ORDER BY id LIMIT 10
`);
writeFileSync(
  join(root, 'tests/scripts/_pre-0035-events-snapshot.json'),
  `${JSON.stringify(snapshot.rows, null, 2)}\n`,
);
console.log('Saved pre-migration snapshot rows:', snapshot.rowCount);

await client.end();
