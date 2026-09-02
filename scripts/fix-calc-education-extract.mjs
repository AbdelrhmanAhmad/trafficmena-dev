#!/usr/bin/env node
/**
 * Re-extracts education content from git originals, resolving {t('...')} calls.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/shared/i18n/locales/en/calculators.json');

const SLUG_BY_FILE = {
  AOVCalculator: 'aov',
  BreakevenROASCalculator: 'breakeven-roas',
  CACCalculator: 'cac',
  CACPaybackCalculator: 'cac-payback',
  CartAbandonmentRateCalculator: 'cart-abandonment',
  CheckoutAbandonmentRateCalculator: 'checkout-abandonment',
  CPCCalculator: 'cpc',
  CPLCalculator: 'cpl',
  CPMCalculator: 'cpm',
  CTRCalculator: 'ctr',
  CVRCalculator: 'cvr',
  GRRCalculator: 'grr',
  LeadToCustomerRateCalculator: 'lead-to-customer',
  LTVCalculator: 'ltv',
  LTVCACCalculator: 'ltv-cac',
  MERCalculator: 'mer',
  MoMGrowthCalculator: 'mom-growth',
  NCACCalculator: 'ncac',
  NRRCalculator: 'nrr',
  ROASCalculator: 'roas',
  RepeatPurchaseRateCalculator: 'repeat-purchase',
  SEOROICalculator: 'seo-roi',
  SaaSLTVCalculator: 'saas-ltv',
};

const en = JSON.parse(readFileSync(enPath, 'utf8'));

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function resolveTCalls(text, slug) {
  return text
    .replace(/\{t\('calcs\.([^']+)'\)\}/g, (_, path) => {
      const value = resolvePath(en.calcs[slug], path.replace(/^[^.]+\./, ''));
      if (value) return value;
      const globalValue = resolvePath(en, `calcs.${path}`);
      return globalValue ?? '';
    })
    .replace(/\{t\('([^']+)'\)\}/g, (_, path) => resolvePath(en, path) ?? '')
    .replace(/\{' '\}/g, ' ')
    .replace(/\{formatCurrency\([^)]+\)\}/g, (m) => {
      if (m.includes("'500'")) return '$500';
      if (m.includes("'5,000'") || m.includes("'5000'")) return '$5,000';
      if (m.includes("'1,000'") || m.includes("'1000'")) return '$1,000';
      if (m.includes("'2.00'")) return '$2.00';
      if (m.includes("'100'")) return '$100';
      if (m.includes("'14,000'")) return '$14,000';
      if (m.includes("'10,000'")) return '$10,000';
      return '$100';
    })
    .replace(/\{currentCurrency\.[^}]+\}/g, '')
    .replace(/\{example\w+\}/g, '$1,000')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(jsx, slug) {
  return resolveTCalls(
    jsx
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '<strong>$1</strong>')
      .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
    slug,
  );
}

function extractHeading(block, slug) {
  const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!h2) return null;
  return resolveTCalls(h2[1], slug);
}

function extractParagraphs(block, slug) {
  const paragraphs = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = regex.exec(block)) !== null) {
    const cls = match[0].match(/className="([^"]*)"/)?.[1] ?? '';
    if (cls.includes('text-neutral-400') || cls.includes('text-[11px]')) continue;
    const text = stripTags(match[1]);
    if (!text || text.startsWith('CPL =') || /^[\w ]+ = /.test(text)) continue;
    if (text.includes('= 1 /') && text.length < 40) continue;
    paragraphs.push(text);
  }
  return paragraphs;
}

function extractBullets(block, slug) {
  const bullets = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = liRegex.exec(block)) !== null) {
    const inner = match[1];
    const labelMatch = inner.match(/<strong[^>]*>([^<:]+):?<\/strong>/);
    const tierMatch = match[0].match(/bg-performance-(\w+)/);
    const text = stripTags(inner.replace(/<strong[^>]*>[^<]*:?<\/strong>/, ''), slug);
    if (labelMatch) {
      bullets.push({
        label: stripTags(labelMatch[1], slug).replace(/:$/, ''),
        text: text.replace(/^:\s*/, ''),
        ...(tierMatch ? { tier: tierMatch[1] } : {}),
      });
    } else if (text) {
      bullets.push({ text: stripTags(inner, slug) });
    }
  }
  return bullets;
}

function extractFormula(block, slug) {
  const code = block.match(/<code[^>]*>([\s\S]*?)<\/code>/);
  if (!code) {
    const mono = block.match(/className="[^"]*font-mono[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (mono) return stripTags(mono[1], slug);
    return undefined;
  }
  return stripTags(code[1], slug);
}

function extractNote(block, slug) {
  const noteMatch = block.match(/<p[^>]*className="[^"]*text-sm[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  if (!noteMatch) return undefined;
  const text = stripTags(noteMatch[1], slug);
  if (text.startsWith('Note:') || text.startsWith('Source:')) return text;
  return undefined;
}

function extractTable(block, slug) {
  const tableMatch = block.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return undefined;
  const table = tableMatch[0];
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    stripTags(m[1], slug),
  );
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .slice(1)
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1], slug)));
  if (headers.length === 0 || rows.length === 0) return undefined;
  return { headers, rows };
}

function splitSections(leftBlock) {
  const sections = [];
  const sectionRegex = /<(section|Card)[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = sectionRegex.exec(leftBlock)) !== null) {
    sections.push(match[2]);
  }
  if (sections.length === 0) {
    const divRegex =
      /<div className="space-y-4"[^>]*>([\s\S]*?)<\/div>\s*(?=<div className="space-y-4"|<\/div>\s*\{\/\* Right)/g;
    while ((match = divRegex.exec(leftBlock)) !== null) {
      sections.push(match[1]);
    }
  }
  return sections;
}

function parseCalculator(content, slug) {
  const leftStart = content.indexOf('Left Column - Educational');
  if (leftStart === -1) return [];
  const rightStart = content.indexOf('Right Column', leftStart);
  const leftBlock = content.slice(leftStart, rightStart === -1 ? undefined : rightStart);
  const rawSections = splitSections(leftBlock);
  const result = [];

  for (const block of rawSections) {
    const heading = extractHeading(block, slug);
    if (!heading) continue;
    const section = { heading };
    const paragraphs = extractParagraphs(block, slug);
    const bullets = extractBullets(block, slug);
    const formula = extractFormula(block, slug);
    const note = extractNote(block, slug);
    const table = extractTable(block, slug);
    if (paragraphs.length) section.paragraphs = paragraphs;
    if (bullets.length) section.bullets = bullets;
    if (formula) section.formula = formula;
    if (note) section.note = note;
    if (table) section.table = table;
    result.push(section);
  }
  return result;
}

for (const [file, slug] of Object.entries(SLUG_BY_FILE)) {
  let content;
  try {
    content = execSync(`git show HEAD:src/features/calculators/components/${file}.tsx`, {
      cwd: root,
      encoding: 'utf8',
    });
  } catch {
    console.warn(`Skip ${file}: not in git`);
    continue;
  }
  const sections = parseCalculator(content, slug);
  en.calcs[slug].education = { sections };
  console.log(`${slug}: ${sections.length} sections, heading[0]=${sections[0]?.heading?.slice(0, 40)}`);
}

writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
console.log('Re-extracted education from git originals');
