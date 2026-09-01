import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SCAN_ROOTS = ['src/pages', 'src/features'] as const;

/** Hardcoded English UI strings still present outside admin surfaces. */
const KNOWN_EXCEPTIONS: Array<{ file: string; snippet: string; reason: string }> = [
  {
    file: 'src/pages/LibraryItemDetail.tsx',
    snippet: 'Please try again shortly.',
    reason: 'Fallback error copy pending i18n migration',
  },
  {
    file: 'src/pages/LibraryItemDetail.tsx',
    snippet: 'Unable to load item',
    reason: 'Library detail error heading pending i18n',
  },
  {
    file: 'src/features/digital-products/pages/PublicDigitalProducts.tsx',
    snippet: 'Sign in',
    reason: 'Guest CTA block pending i18n migration',
  },
  {
    file: 'src/features/digital-products/pages/PublicDigitalProducts.tsx',
    snippet: 'Sign up free',
    reason: 'Guest CTA block pending i18n migration',
  },
  {
    file: 'src/features/series/pages/PublicRecordings.tsx',
    snippet: 'Sign in',
    reason: 'Guest CTA block pending i18n migration',
  },
  {
    file: 'src/features/series/pages/PublicRecordings.tsx',
    snippet: 'Sign up free',
    reason: 'Guest CTA block pending i18n migration',
  },
  {
    file: 'src/features/events/components/EventAttendeesList.tsx',
    snippet: 'Unable to load attendees',
    reason: 'Staff attendee list error copy pending i18n',
  },
  {
    file: 'src/features/tracks/components/TrackAttendeesList.tsx',
    snippet: 'Unable to load enrolled users',
    reason: 'Staff attendee list error copy pending i18n',
  },
  {
    file: 'src/features/series/components/SeriesAttendeesList.tsx',
    snippet: 'Unable to load enrolled users',
    reason: 'Staff attendee list error copy pending i18n',
  },
  {
    file: 'src/features/digital-products/components/DigitalProductBuyActions.tsx',
    snippet: 'Could not start checkout',
    reason: 'Checkout fallback error pending i18n',
  },
  {
    file: 'src/features/series/components/SeriesBuyActions.tsx',
    snippet: 'Could not start checkout',
    reason: 'Checkout fallback error pending i18n',
  },
  {
    file: 'src/features/events/components/AdminEventForm.tsx',
    snippet: 'Saving...',
    reason: 'Manager form submit label pending i18n',
  },
  {
    file: 'src/features/library/components/LibraryAssetForm.tsx',
    snippet: 'Saving...',
    reason: 'Manager form submit label pending i18n',
  },
  {
    file: 'src/features/series/components/SeriesForm.tsx',
    snippet: 'Saving...',
    reason: 'Manager form submit label pending i18n',
  },
  {
    file: 'src/features/digital-products/components/DigitalProductVideosCrud.tsx',
    snippet: 'Save changes',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/digital-products/components/DigitalProductFilesCrud.tsx',
    snippet: 'Save changes',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/digital-products/components/DigitalProductFilesCrud.tsx',
    snippet: 'Saving...',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/masterclasses/components/MasterclassLessonVideosCrud.tsx',
    snippet: 'Save changes',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/masterclasses/components/MasterclassLessonFilesCrud.tsx',
    snippet: 'Save changes',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/masterclasses/components/MasterclassLessonFilesCrud.tsx',
    snippet: 'Saving...',
    reason: 'Manager CRUD labels pending i18n',
  },
  {
    file: 'src/features/events/pages/AdminEventDetail.tsx',
    snippet: 'Unable to load this event',
    reason: 'Manager event detail error pending i18n',
  },
  {
    file: 'src/features/events/pages/AdminMeetups.tsx',
    snippet: 'Unable to load events from the new API',
    reason: 'Manager events list error pending i18n',
  },
  {
    file: 'src/features/series/components/SeriesAccessManager.tsx',
    snippet: 'Unable to load member list',
    reason: 'Series access manager error pending i18n',
  },
  {
    file: 'src/features/tracks/components/TrackManualEnrollmentManager.tsx',
    snippet: 'Unable to load matching members',
    reason: 'Track enrollment manager error pending i18n',
  },
  {
    file: 'src/features/tracks/pages/AdminTrackDetail.tsx',
    snippet: 'Unable to load this track',
    reason: 'Manager track detail error pending i18n',
  },
];

const UI_LITERAL_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Loading...', regex: /Loading\.\.\./g },
  { name: 'Saving...', regex: /Saving\.\.\./g },
  { name: 'Save changes', regex: /['"]Save changes['"]/g },
  { name: 'Sign in', regex: />\s*Sign in\s*</g },
  { name: 'Sign up free', regex: />\s*Sign up free\s*</g },
  { name: 'Please try again', regex: /Please try again/g },
  { name: 'Unable to load', regex: /Unable to load/g },
  { name: 'Could not start checkout', regex: /Could not start checkout/g },
];

/** Fail if new hardcoded literals appear beyond documented exceptions. */
const MAX_UNDOCUMENTED_HITS = 0;

type LiteralHit = { file: string; pattern: string; line: number; excerpt: string };

function isAdminPath(relativePath: string): boolean {
  return relativePath.split(/[/\\]/).includes('admin');
}

function collectTsxFiles(rootDir: string, base = rootDir): string[] {
  const entries = readdirSync(rootDir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(rootDir, entry);
    const relative = fullPath.slice(base.length + 1).replace(/\\/g, '/');

    if (statSync(fullPath).isDirectory()) {
      if (isAdminPath(relative)) continue;
      files.push(...collectTsxFiles(fullPath, base));
      continue;
    }

    if (entry.endsWith('.tsx') && !isAdminPath(relative)) {
      files.push(fullPath.replace(/\\/g, '/'));
    }
  }

  return files;
}

function isKnownException(file: string, excerpt: string): boolean {
  const normalizedFile = file.replace(/\\/g, '/');
  return KNOWN_EXCEPTIONS.some(
    (entry) => normalizedFile.endsWith(entry.file) && excerpt.includes(entry.snippet),
  );
}

function scanFile(filePath: string): LiteralHit[] {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const hits: LiteralHit[] = [];

  for (const { name, regex } of UI_LITERAL_PATTERNS) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!regex.test(line)) continue;
      regex.lastIndex = 0;

      hits.push({
        file: filePath,
        pattern: name,
        line: index + 1,
        excerpt: line.trim(),
      });
    }
  }

  return hits;
}

describe('raw English UI literals audit (pages/features, non-admin)', () => {
  it('reports hardcoded UI strings and stays within documented exceptions', () => {
    const files = SCAN_ROOTS.flatMap((root) => collectTsxFiles(root));
    const allHits = files.flatMap((file) => scanFile(file));

    const undocumented = allHits.filter((hit) => !isKnownException(hit.file, hit.excerpt));

    const summary = allHits.reduce<Record<string, number>>((acc, hit) => {
      acc[hit.pattern] = (acc[hit.pattern] ?? 0) + 1;
      return acc;
    }, {});

    // Visible in test output for tracking migration progress.
    console.log('[raw-literals-audit] total hits:', allHits.length);
    console.log('[raw-literals-audit] by pattern:', summary);
    console.log('[raw-literals-audit] undocumented:', undocumented.length);

    assert.ok(
      undocumented.length <= MAX_UNDOCUMENTED_HITS,
      `Found ${undocumented.length} undocumented hardcoded UI literal(s):\n${undocumented
        .map((hit) => `${hit.file}:${hit.line} [${hit.pattern}] ${hit.excerpt}`)
        .join('\n')}`,
    );
  });
});
