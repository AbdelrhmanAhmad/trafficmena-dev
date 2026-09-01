import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(import.meta.dirname, '../..');
const en = JSON.parse(
  readFileSync(join(root, 'src/shared/i18n/locales/en/calculators.json'), 'utf8'),
);
const ar = JSON.parse(
  readFileSync(join(root, 'src/shared/i18n/locales/ar/calculators.json'), 'utf8'),
);

const SLUGS = Object.keys(en.calcs);

/** Values intentionally identical across locales (acronyms, tiers, brands, numeric placeholders). */
const IDENTICAL_OK = new Set([
  '0',
  '—',
  '%',
  'Yes',
  'No',
  'ROAS',
  'ROI',
  'LTV',
  'CAC',
  'AOV',
  'MER',
  'GRR',
  'NRR',
  'CMGR',
  'MoM',
  'CPC',
  'CPM',
  'CPL',
  'CTR',
  'CVR',
  'nCAC',
  'ARPU',
  'MRR',
  'SEO',
  'SaaS',
  'B2B',
  'B2C',
  'breakeven',
  'excellent',
  'good',
  'loss',
  'Meta (Facebook)',
  'Meta (Facebook/Instagram)',
  'Instagram',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Snapchat',
  'Google Ads',
  'Google Ads (Search)',
  'Google Ads (Display)',
  'Google Slides',
  'you@example.com',
  'e.g., 100000',
  'e.g., 120000',
  'e.g., 10000',
  'e.g., 20000',
  'e.g., 11',
  'e.g., 3',
  'e.g., 50',
  'e.g., 300',
  'e.g., 10',
  'e.g., 5000',
]);

function isUserFacingEnglishIdentical(enVal: string, arVal: string, path: string): boolean {
  if (enVal !== arVal) return false;
  if (path.includes('.tier')) return false;
  if (IDENTICAL_OK.has(enVal.trim())) return false;
  if (/^\{\{[^}]+\}\}(: \{\{[^}]+\}\})?$/.test(enVal.trim())) return false;
  if (/^[•\s]*Google Ads$/i.test(enVal.trim())) return false;
  if (/^[A-Z]{2,6}: \{\{[^}]+\}\}/.test(enVal)) return false;
  if (!/[A-Za-z]{4,}/.test(enVal)) return false;
  if (/^[\d$%.,+\-/x:\s]+$/.test(enVal)) return false;
  return true;
}

type Untranslated = { path: string; value: string };

function collectUntranslated(enVal: unknown, arVal: unknown, path = ''): Untranslated[] {
  if (typeof enVal === 'string' && typeof arVal === 'string') {
    return isUserFacingEnglishIdentical(enVal, arVal, path) ? [{ path, value: enVal }] : [];
  }
  if (Array.isArray(enVal) && Array.isArray(arVal)) {
    return enVal.flatMap((item, index) => collectUntranslated(item, arVal[index], `${path}[${index}]`));
  }
  if (enVal && typeof enVal === 'object' && arVal && typeof arVal === 'object') {
    return Object.keys(enVal).flatMap((key) =>
      collectUntranslated(
        (enVal as Record<string, unknown>)[key],
        (arVal as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      ),
    );
  }
  return [];
}

describe('calculator locale completeness (ar calculators.json)', () => {
  it('has education sections for all 23 calculators in EN and AR', () => {
    assert.equal(SLUGS.length, 23);
    for (const slug of SLUGS) {
      const enSections = en.calcs[slug]?.education?.sections;
      const arSections = ar.calcs[slug]?.education?.sections;
      assert.ok(Array.isArray(enSections) && enSections.length > 0, `${slug} missing EN education`);
      assert.ok(Array.isArray(arSections) && arSections.length > 0, `${slug} missing AR education`);
      assert.equal(arSections.length, enSections.length, `${slug} education section count mismatch`);
    }
  });

  it('has no user-facing EN/AR identical strings beyond documented exceptions', () => {
    const untranslated = collectUntranslated(en, ar);
    const sample = untranslated.slice(0, 25).map((hit) => `${hit.path}: ${hit.value.slice(0, 80)}`);

    assert.equal(
      untranslated.length,
      0,
      `Found ${untranslated.length} untranslated calculator string(s):\n${sample.join('\n')}`,
    );
  });
});
