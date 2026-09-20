/**
 * Idempotent seed for ECD ticket packages + features (ct / fj).
 * Partners/speakers intentionally empty — fill via admin.
 *
 *   cd server && node scripts/seed-ecd-content.mjs
 */
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
config({ path: path.join(serverRoot, '.env') });

const connectionString = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL (or DATABASE_ADMIN_URL) is missing');
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

const packages = [
  {
    ticket_type: 'ct',
    display_name: 'Conference Pass',
    eyebrow: 'Conference Pass',
    title: 'The Live Stage Experience',
    tagline: 'See the whole system.',
    description:
      'Market perspectives, case studies, industry conversations, and networking.',
    badge: null,
    cta_label: 'Get Conference Pass',
    price_cents: Number(process.env.ECD_PRICE_CT_CENTS || 250000),
  },
  {
    ticket_type: 'fj',
    display_name: 'All Access Pass',
    eyebrow: 'All Access Pass',
    title: 'The Full ECommerce Day Experience',
    tagline: 'Learn it. Work on it. Apply it.',
    description:
      'Workshops, deeper application, and continued learning after the event.',
    badge: 'Complete Access',
    cta_label: 'Get All Access Pass',
    price_cents: Number(process.env.ECD_PRICE_FJ_CENTS || 450000),
  },
];

const features = {
  ct: [
    { kind: 'included', label: 'Main Stage', emphasis: 0 },
    { kind: 'included', label: 'Local Brands Stage', emphasis: 0 },
    { kind: 'included', label: 'Keynotes and panels', emphasis: 0 },
    { kind: 'included', label: 'Ecommerce case studies', emphasis: 0 },
    { kind: 'included', label: 'Sponsor activations', emphasis: 0 },
    { kind: 'included', label: 'General networking', emphasis: 0 },
    { kind: 'excluded', label: 'Workshops', emphasis: 0 },
    {
      kind: 'excluded',
      label: 'Content platform, recordings, and materials',
      emphasis: 0,
    },
  ],
  fj: [
    { kind: 'included', label: 'Everything in the Conference Pass', emphasis: 1 },
    { kind: 'included', label: 'Five workshops', emphasis: 0 },
    { kind: 'included', label: 'Content platform access', emphasis: 0 },
    { kind: 'included', label: 'Six months of continued access', emphasis: 0 },
    { kind: 'included', label: 'Main Stage recordings', emphasis: 0 },
    { kind: 'included', label: 'Local Brands Stage recordings', emphasis: 0 },
    { kind: 'included', label: 'Workshop recordings', emphasis: 0 },
    { kind: 'included', label: 'Presentation slides', emphasis: 0 },
    { kind: 'included', label: 'Workshop materials', emphasis: 0 },
  ],
};

try {
  await client.query('BEGIN');

  for (const pkg of packages) {
    await client.query(
      `INSERT INTO ecd_ticket_packages (
        ticket_type, display_name, eyebrow, title, tagline, description,
        badge, cta_label, price_cents, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
      ON CONFLICT (ticket_type) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        eyebrow = EXCLUDED.eyebrow,
        title = EXCLUDED.title,
        tagline = EXCLUDED.tagline,
        description = EXCLUDED.description,
        badge = EXCLUDED.badge,
        cta_label = EXCLUDED.cta_label,
        price_cents = EXCLUDED.price_cents,
        updated_at = now()`,
      [
        pkg.ticket_type,
        pkg.display_name,
        pkg.eyebrow,
        pkg.title,
        pkg.tagline,
        pkg.description,
        pkg.badge,
        pkg.cta_label,
        pkg.price_cents,
      ],
    );

    await client.query(`DELETE FROM ecd_ticket_features WHERE ticket_type = $1`, [
      pkg.ticket_type,
    ]);

    const list = features[pkg.ticket_type];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      await client.query(
        `INSERT INTO ecd_ticket_features (ticket_type, kind, label, emphasis, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [pkg.ticket_type, f.kind, f.label, f.emphasis, i],
      );
    }
  }

  await client.query('COMMIT');
  console.log('seeded ecd_ticket_packages + ecd_ticket_features (ct, fj)');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('seed failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
