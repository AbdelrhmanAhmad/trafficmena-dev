import { config } from 'dotenv';
import pg from 'pg';
import {
  COMMERCE_RENUMBERED_TAGS,
  UPSTREAM_TAGS,
  fingerprintForTag,
  getIdempotentSql,
  isProductionLikeDatabase,
  loadAppliedHashes,
  loadMigrationCatalog,
  serverRoot,
  stampMigration,
} from './migration-reconcile-lib.mjs';

config({ path: `${serverRoot}/.env` });

const { Client } = pg;
const apply = process.argv.includes('--apply');
const REQUIRED_SIGNOFF = 'baseline-reviewed-backup-confirmed';

function pendingEntries(entries, appliedHashes) {
  return entries.filter((entry) => !appliedHashes.has(entry.hash));
}

async function applyIdempotentSql(client, tag, sql) {
  console.log(`[migration-reconcile] Applying idempotent SQL for ${tag}...`);
  await client.query(sql);
}

async function reconcileEntry(client, entry, dryRun) {
  if (!UPSTREAM_TAGS.includes(entry.tag) && !COMMERCE_RENUMBERED_TAGS.includes(entry.tag)) {
    return { action: 'skip-non-target' };
  }

  const fingerprint = await fingerprintForTag(client, entry.tag);
  if (fingerprint) {
    if (dryRun) {
      return { action: 'stamp', reason: 'fingerprint matched existing schema' };
    }
    await stampMigration(client, entry);
    return { action: 'stamped', reason: 'fingerprint matched existing schema' };
  }

  const idempotentSql = getIdempotentSql(entry.tag);
  if (idempotentSql) {
    if (dryRun) {
      return { action: 'apply+stamp', reason: 'missing fingerprint; idempotent SQL available' };
    }
    await applyIdempotentSql(client, entry.tag, idempotentSql);
    const after = await fingerprintForTag(client, entry.tag);
    if (!after) {
      throw new Error(`${entry.tag} still missing required schema after idempotent apply`);
    }
    await stampMigration(client, entry);
    return { action: 'applied+stamped', reason: 'idempotent SQL applied' };
  }

  if (COMMERCE_RENUMBERED_TAGS.includes(entry.tag)) {
    throw new Error(
      `${entry.tag} is pending but commerce schema fingerprint is incomplete. ` +
        'Manual DBA review is required; this script will not replay CREATE TYPE/TABLE migrations on a populated database.',
    );
  }

  throw new Error(`${entry.tag} has no safe idempotent apply path`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (apply && isProductionLikeDatabase(databaseUrl)) {
    const signoff = process.env.MIGRATION_RECONCILE_SIGNOFF;
    const signedBy = process.env.MIGRATION_RECONCILE_SIGNOFF_BY?.trim();
    if (signoff !== REQUIRED_SIGNOFF || !signedBy) {
      console.error(`
[migration-reconcile] Refusing --apply on production-like database without signoff.

Set:
  MIGRATION_RECONCILE_SIGNOFF=${REQUIRED_SIGNOFF}
  MIGRATION_RECONCILE_SIGNOFF_BY="<approver name/email>"
`);
      process.exit(1);
    }
    console.info(`[migration-reconcile] Production-like signoff accepted from ${signedBy}.`);
  }

  const { entries } = loadMigrationCatalog();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const appliedHashes = await loadAppliedHashes(client);
    const pending = pendingEntries(entries, appliedHashes);
    const targetPending = pending.filter(
      (entry) => UPSTREAM_TAGS.includes(entry.tag) || COMMERCE_RENUMBERED_TAGS.includes(entry.tag),
    );

    console.log(`[migration-reconcile] Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`[migration-reconcile] Pending target migrations: ${targetPending.length}`);

    if (targetPending.length === 0) {
      console.log('[migration-reconcile] Nothing to reconcile.');
      return;
    }

    if (apply) {
      await client.query('BEGIN');
    }

    for (const entry of targetPending) {
      const result = await reconcileEntry(client, entry, !apply);
      console.log(`[migration-reconcile] ${entry.tag}: ${result.action}${result.reason ? ` (${result.reason})` : ''}`);
    }

    if (apply) {
      await client.query('COMMIT');
      console.log('[migration-reconcile] Reconcile transaction committed.');
    } else {
      console.log('[migration-reconcile] Dry run complete. Re-run with --apply to execute safely.');
    }
  } catch (error) {
    if (apply) {
      await client.query('ROLLBACK');
      console.error('[migration-reconcile] Rolled back transaction.');
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[migration-reconcile] Failed:', error.message);
  process.exit(1);
});
