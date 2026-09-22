/**
 * Idempotent seed for ECD agenda sessions.
 * Source of truth: Traffic-Mena-event/data.text (times/formats/slugs).
 * Titles/speakers stay TBA until announced in admin CMS.
 *
 *   cd server && node scripts/seed-ecd-sessions.mjs
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

/** Capacity drafts (CLAUDE.md — subject to venue). Applied per FJ track session. */
const TRACK_CAPACITY = { 2: 80, 3: 200, 4: 100 };

const TBA_TITLE = 'Topic will be announced';
const TBA_SPEAKER = 'Speaker will be announced';

/**
 * Extracted from Traffic-Mena-event/data.text
 * track: 0 Main · 1 Second · 2 Acquisition · 3 CRO · 4 Ops
 */
const sessions = [
  // MAIN STAGE
  { slug: 'm1', tr: 0, time: '11:20', fmt: 'Keynote' },
  { slug: 'm2', tr: 0, time: '11:50', fmt: 'Fireside Chat' },
  { slug: 'm3', tr: 0, time: '12:20', fmt: 'Panel' },
  { slug: 'm4', tr: 0, time: '1:30', fmt: 'Solo Talk' },
  { slug: 'm5', tr: 0, time: '2:00', fmt: 'Panel' },
  { slug: 'm6', tr: 0, time: '2:50', fmt: 'Solo Talk' },
  { slug: 'm7', tr: 0, time: '3:35', fmt: 'Panel' },
  { slug: 'm8', tr: 0, time: '4:25', fmt: 'Solo Talk' },
  { slug: 'm9', tr: 0, time: '4:55', fmt: 'Solo Talk' },
  { slug: 'm10', tr: 0, time: '5:50', fmt: 'Closing Keynote' },
  { slug: 'm11', tr: 0, time: '6:15', fmt: 'Closing Panel' },

  // SECOND STAGE
  { slug: 's1', tr: 1, time: '11:30', fmt: 'Case Study' },
  { slug: 's2', tr: 1, time: '12:30', fmt: 'Success Story' },
  { slug: 's3', tr: 1, time: '2:00', fmt: 'AMA Panel' },
  { slug: 's4', tr: 1, time: '3:30', fmt: 'Discussion Panel' },

  // ACQUISITION (FJ) — reservation slots 1–5
  { slug: 'w1a', tr: 2, time: '12:30', fmt: 'Workshop' },
  { slug: 'w1b', tr: 2, time: '1:30', fmt: 'Workshop' },
  { slug: 'w1c', tr: 2, time: '2:30', fmt: 'Workshop' },
  { slug: 'w1d', tr: 2, time: '3:30', fmt: 'Workshop' },
  { slug: 'w1e', tr: 2, time: '4:30', fmt: 'Workshop' },

  // CRO & RETENTION (FJ)
  { slug: 'w2a', tr: 3, time: '12:30', fmt: 'Workshop' },
  { slug: 'w2b', tr: 3, time: '1:30', fmt: 'Workshop' },
  { slug: 'w2c', tr: 3, time: '2:30', fmt: 'Workshop' },
  { slug: 'w2d', tr: 3, time: '3:30', fmt: 'Workshop' },
  { slug: 'w2e', tr: 3, time: '4:30', fmt: 'Workshop' },

  // OPERATIONS & LOGISTICS (FJ)
  { slug: 'w3a', tr: 4, time: '12:30', fmt: 'Workshop' },
  { slug: 'w3b', tr: 4, time: '1:30', fmt: 'Workshop' },
  { slug: 'w3c', tr: 4, time: '2:30', fmt: 'Workshop' },
  { slug: 'w3d', tr: 4, time: '3:30', fmt: 'Workshop' },
  { slug: 'w3e', tr: 4, time: '4:30', fmt: 'Workshop' },
];

function categoryFor(fmt, tr) {
  if (tr >= 2) return 'Workshops';
  if (/Keynote/i.test(fmt)) return 'Keynotes';
  if (/Panel/i.test(fmt)) return 'Panels';
  if (/Case|Success/i.test(fmt)) return 'Case Studies';
  if (/Fireside/i.test(fmt)) return 'Founder Stories';
  return 'Sessions';
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  let upserted = 0;
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const fj = s.tr >= 2 ? 1 : 0;
    const capacity = TRACK_CAPACITY[s.tr] ?? null;
    await client.query(
      `INSERT INTO ecd_sessions (
        slug, track_index, time_label, format, category, title, speaker_label,
        topics, description, learn, output, tools, level,
        full_journey_only, capacity, sort_order, published, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8::jsonb, $9, $10::jsonb, $11, $12, $13,
        $14, $15, $16, 1, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        track_index = EXCLUDED.track_index,
        time_label = EXCLUDED.time_label,
        format = EXCLUDED.format,
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        speaker_label = EXCLUDED.speaker_label,
        topics = EXCLUDED.topics,
        description = EXCLUDED.description,
        learn = EXCLUDED.learn,
        output = EXCLUDED.output,
        tools = EXCLUDED.tools,
        level = EXCLUDED.level,
        full_journey_only = EXCLUDED.full_journey_only,
        capacity = EXCLUDED.capacity,
        sort_order = EXCLUDED.sort_order,
        published = 1,
        updated_at = now()`,
      [
        s.slug,
        s.tr,
        s.time,
        s.fmt,
        categoryFor(s.fmt, s.tr),
        TBA_TITLE,
        TBA_SPEAKER,
        JSON.stringify([]),
        null,
        JSON.stringify([]),
        null,
        null,
        null,
        fj,
        capacity,
        i,
      ],
    );
    upserted += 1;
  }
  console.log(`OK — upserted ${upserted} sessions from data.text (TBA titles)`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
