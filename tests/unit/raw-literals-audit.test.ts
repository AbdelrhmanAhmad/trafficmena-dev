import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SCAN_ROOTS = ['src/pages', 'src/features', 'src/shared/components'] as const;

const CONTENT_GLOBS = [
  'src/features/subscribe/content.ts',
  'src/features/subscribe/subscribeIcons.ts',
] as const;

/** Admin-only or non-user-facing exceptions only. Public/member strings must use i18n. */
const KNOWN_EXCEPTIONS: Array<{ file: string; snippet: string; reason: string }> = [
  {
    file: 'src/features/subscribe/subscribeIcons.ts',
    snippet: 'LucideIcon',
    reason: 'Icon registry keys are technical identifiers, not user-facing copy',
  },
];

const UI_LITERAL_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Loading...', regex: /Loading\.\.\./g },
  { name: 'Saving...', regex: /['"]Saving\.\.\.['"]/g },
  { name: 'Save changes', regex: /['"]Save changes['"]/g },
  { name: 'Sign in', regex: />\s*Sign in\s*</g },
  { name: 'Sign up free', regex: />\s*Sign up free\s*</g },
  { name: 'Please try again', regex: /Please try again/g },
  { name: 'Unable to load', regex: /Unable to load/g },
  { name: 'Could not start checkout', regex: /Could not start checkout/g },
  { name: 'Change email', regex: /['"]Change email['"]/g },
  { name: 'Back to Series', regex: /Back to Series/g },
  { name: 'Video Content', regex: /Video Content/g },
  { name: 'Document Attached', regex: /Document Attached/g },
  { name: 'Send code to current email', regex: /Send code to current email/g },
  { name: 'Verify & update', regex: /Verify & update/g },
];

const ENGLISH_SENTENCE_IN_QUOTES = /['"]([A-Z][^'"]{12,})['"]/g;

/** Fail if new hardcoded literals appear beyond documented exceptions. */
const MAX_UNDOCUMENTED_HITS = 0;

type LiteralHit = { file: string; pattern: string; line: number; excerpt: string };

function isStaffSurfacePath(relativePath: string): boolean {
  const segments = relativePath.split(/[/\\]/);
  if (segments.includes('admin')) return true;
  const fileName = segments[segments.length - 1] ?? '';
  if (/^Admin[A-Z]/.test(fileName)) return true;
  if (fileName.endsWith('AttendeesList.tsx')) return true;
  if (
    fileName === 'SeriesForm.tsx' ||
    fileName === 'LibraryAssetForm.tsx' ||
    fileName === 'AdminEventForm.tsx' ||
    fileName === 'ExpertForm.tsx' ||
    fileName === 'EventExpertPicker.tsx'
  ) {
    return true;
  }
  if (fileName.includes('AccessManager') || fileName.includes('EnrollmentManager')) return true;
  if (fileName.includes('Crud.tsx')) return true;
  if (fileName === 'RemoveTrackEventDialog.tsx') return true;
  if (fileName === 'TrackRecordingsPublishCard.tsx') return true;
  if (fileName === 'AppLayout.tsx') return true;
  return false;
}

function collectTsxFiles(rootDir: string, base = rootDir): string[] {
  const entries = readdirSync(rootDir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(rootDir, entry);
    const relative = fullPath.slice(base.length + 1).replace(/\\/g, '/');

    if (statSync(fullPath).isDirectory()) {
      if (isStaffSurfacePath(relative)) continue;
      files.push(...collectTsxFiles(fullPath, base));
      continue;
    }

    if (entry.endsWith('.tsx') && !isStaffSurfacePath(relative)) {
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

function isAllowedQuotedSentence(sentence: string, line: string): boolean {
  if (line.includes('t(') || line.includes('i18n')) return true;
  if (line.includes('import ') || line.includes('from ')) return true;
  if (line.includes('console.') || line.includes('aria-') || line.includes('data-')) return true;
  if (/^https?:\/\//.test(sentence)) return true;
  if (/^[A-Z_]+$/.test(sentence)) return true;
  if (sentence.includes('TrafficMENA')) return true;
  return false;
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

  if (filePath.includes('/features/subscribe/content.ts')) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      ENGLISH_SENTENCE_IN_QUOTES.lastIndex = 0;
      let match = ENGLISH_SENTENCE_IN_QUOTES.exec(line);
      while (match) {
        if (!isAllowedQuotedSentence(match[1], line)) {
          hits.push({
            file: filePath,
            pattern: 'English sentence in content.ts',
            line: index + 1,
            excerpt: line.trim(),
          });
        }
        match = ENGLISH_SENTENCE_IN_QUOTES.exec(line);
      }
    }
  }

  return hits;
}

describe('raw English UI literals audit (public/member surfaces)', () => {
  it('reports hardcoded UI strings and stays within documented exceptions', () => {
    const files = [
      ...SCAN_ROOTS.flatMap((root) => collectTsxFiles(root)),
      ...CONTENT_GLOBS.map((relative) => join(process.cwd(), relative).replace(/\\/g, '/')),
    ];
    const uniqueFiles = [...new Set(files)];
    const allHits = uniqueFiles.flatMap((file) => scanFile(file));

    const undocumented = allHits.filter((hit) => !isKnownException(hit.file, hit.excerpt));

    const summary = allHits.reduce<Record<string, number>>((acc, hit) => {
      acc[hit.pattern] = (acc[hit.pattern] ?? 0) + 1;
      return acc;
    }, {});

    console.log('[raw-literals-audit] files scanned:', uniqueFiles.length);
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
