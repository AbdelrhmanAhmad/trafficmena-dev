import { config } from 'dotenv';

config({ path: new URL('../.env', import.meta.url) });

const REQUIRED_SIGNOFF = 'preflight-reviewed-backup-confirmed';
const databaseUrl = process.env.DATABASE_URL ?? '';

function isLocalDatabase(url) {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      databaseName.endsWith('_dev') ||
      databaseName.endsWith('_test')
    );
  } catch {
    return false;
  }
}

function isProductionLikeDatabase() {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  if (process.env.DB_SSL === 'true') {
    return true;
  }
  return !isLocalDatabase(databaseUrl);
}

if (!isProductionLikeDatabase()) {
  process.exit(0);
}

const signoff = process.env.EVENT_FORMAT_0018_SIGNOFF;
const signedBy = process.env.EVENT_FORMAT_0018_SIGNOFF_BY?.trim();

if (signoff === REQUIRED_SIGNOFF && signedBy) {
  console.info(`[migration-gate] Event format 0018 signoff accepted from ${signedBy}.`);
  process.exit(0);
}

console.error(`
[migration-gate] Refusing to run production-like db:migrate before event_format 0018 signoff.

Required before applying 0018_fast_sleepwalker.sql:
1. Run: npm --prefix server run db:preflight:event-format
2. Store the full preflight_event_format_report.sql output in the deployment ticket.
3. Confirm a production database backup or provider snapshot exists.
4. Record human signoff, then rerun with:
   EVENT_FORMAT_0018_SIGNOFF=${REQUIRED_SIGNOFF}
   EVENT_FORMAT_0018_SIGNOFF_BY="<approver name/email>"

This guard is intentionally conservative because the migration rewrites pricing/access semantics
and clears literal delivery-mode location text.
`);

process.exit(1);
