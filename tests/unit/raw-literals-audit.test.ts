import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SCAN_ROOTS = ['src/pages', 'src/features'] as const;

/** Admin-only or non-user-facing exceptions only. Public/member strings must use i18n. */
const KNOWN_EXCEPTIONS: Array<{ file: string; snippet: string; reason: string }> = [];

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

function isStaffSurfacePath(relativePath: string): boolean {
  const segments = relativePath.split(/[/\\]/);
  if (segments.includes('admin')) return true;
  const fileName = segments[segments.length - 1] ?? '';
  if (/^Admin[A-Z]/.test(fileName)) return true;
  if (fileName.endsWith('AttendeesList.tsx')) return true;
  if (
    fileName === 'SeriesForm.tsx' ||
    fileName === 'LibraryAssetForm.tsx' ||
    fileName === 'AdminEventForm.tsx'
  ) {
    return true;
  }
  if (fileName.includes('AccessManager') || fileName.includes('EnrollmentManager')) return true;
  if (fileName.includes('Crud.tsx')) return true;
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
