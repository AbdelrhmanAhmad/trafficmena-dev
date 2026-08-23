import { config } from 'dotenv';
import pg from 'pg';
import {
  COMMERCE_RENUMBERED_TAGS,
  UPSTREAM_TAGS,
  fingerprintForTag,
  loadAppliedHashes,
  loadMigrationCatalog,
  serverRoot,
} from './migration-reconcile-lib.mjs';

config({ path: `${serverRoot}/.env` });

const { Client } = pg;

function pendingEntries(entries, appliedHashes) {
  return entries.filter((entry) => !appliedHashes.has(entry.hash));
}

async function main() {
  const { entries } = loadMigrationCatalog();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const appliedHashes = await loadAppliedHashes(client);
    const pending = pendingEntries(entries, appliedHashes);

    console.log('[migration-audit] Database:', process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@'));
    console.log('[migration-audit] Journal entries:', entries.length);
    console.log('[migration-audit] Applied hashes:', appliedHashes.size);
    console.log('[migration-audit] Pending tags:', pending.length);
    console.log('');

    for (const entry of entries) {
      const applied = appliedHashes.has(entry.hash);
      const fingerprint =
        UPSTREAM_TAGS.includes(entry.tag) || COMMERCE_RENUMBERED_TAGS.includes(entry.tag)
          ? await fingerprintForTag(client, entry.tag)
          : null;
      const status = applied ? 'applied' : 'pending';
      const fp =
        fingerprint === null ? '' : fingerprint ? ' fingerprint=match' : ' fingerprint=missing';
      console.log(`${String(entry.idx).padStart(2)} ${status.padEnd(7)} ${entry.tag}${applied ? '' : fp}`);
    }

    if (pending.length > 0) {
      console.log('');
      console.log('[migration-audit] Action required before db:migrate on this database:');
      console.log('  npm --prefix server run db:migrate:reconcile:apply');
      console.log('  npm --prefix server run db:migrate:safe');
    } else {
      console.log('');
      console.log('[migration-audit] Drizzle journal matches this database.');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[migration-audit] Failed:', error.message);
  process.exit(1);
});
