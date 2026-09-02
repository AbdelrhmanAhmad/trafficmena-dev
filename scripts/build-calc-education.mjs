#!/usr/bin/env node
/**
 * Extracts educational left-column content from calculator TSX files
 * and merges education.sections into en/calculators.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/features/calculators/components');
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

function stripJsx(text) {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeading(block) {
  const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!h2) return null;
  return stripJsx(h2[1]);
}

function extractParagraphs(block) {
  const paragraphs = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = regex.exec(block)) !== null) {
    const cls = match[0].match(/className="([^"]*)"/)?.[1] ?? '';
    if (cls.includes('text-sm') && cls.includes('text-neutral-400')) continue;
    if (cls.includes('text-[11px]')) continue;
    const text = htmlToRichText(match[1]);
    if (text && !text.startsWith('CPL =') && !text.includes('= 1 /')) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

function htmlToRichText(jsx) {
  let text = jsx
    .replace(/\{' '\}/g, ' ')
    .replace(/\{formatCurrency\([^)]+\)\}/g, '{{amount}}')
    .replace(/\{currentCurrency\.[^}]+\}/g, '')
    .replace(/\{example\w+\}/g, '{{amount}}')
    .replace(/\{t\([^)]+\)\}/g, '')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '<strong>$1</strong>')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function extractBullets(block) {
  const bullets = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  while ((match = liRegex.exec(block)) !== null) {
    const inner = match[1];
    const labelMatch = inner.match(/<strong[^>]*>([^<:]+):?<\/strong>/);
    const tierMatch = match[0].match(/bg-performance-(\w+)/);
    const text = htmlToRichText(inner.replace(/<strong[^>]*>[^<]*:?<\/strong>/, ''));
    if (labelMatch) {
      bullets.push({
        label: labelMatch[1].replace(/:$/, ''),
        text: text.replace(/^:\s*/, ''),
        ...(tierMatch ? { tier: tierMatch[1] } : {}),
      });
    } else if (text) {
      bullets.push({ text: htmlToRichText(inner) });
    }
  }
  return bullets;
}

function extractFormula(block) {
  const code = block.match(/<code[^>]*>([\s\S]*?)<\/code>/);
  if (!code) return undefined;
  return htmlToRichText(code[1]);
}

function extractNote(block) {
  const noteMatch = block.match(
    /<p[^>]*className="[^"]*text-sm[^"]*"[^>]*>([\s\S]*?)<\/p>/,
  );
  if (!noteMatch) return undefined;
  const text = htmlToRichText(noteMatch[1]);
  if (text.startsWith('Note:') || text.startsWith('Source:')) return text;
  return undefined;
}

function extractTable(block) {
  const tableMatch = block.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return undefined;
  const table = tableMatch[0];
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    stripJsx(m[1]),
  );
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .slice(1)
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripJsx(c[1])));
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
    const divRegex = /<div className="space-y-4"[^>]*>([\s\S]*?)<\/div>\s*(?=<div className="space-y-4"|<\/div>\s*\{\/\* Right)/g;
    while ((match = divRegex.exec(leftBlock)) !== null) {
      sections.push(match[1]);
    }
  }
  return sections;
}

function parseCalculator(content) {
  const leftStart = content.indexOf('Left Column - Educational');
  if (leftStart === -1) return [];
  const rightStart = content.indexOf('Right Column', leftStart);
  const leftBlock = content.slice(leftStart, rightStart === -1 ? undefined : rightStart);
  const rawSections = splitSections(leftBlock);
  const result = [];

  for (const block of rawSections) {
    const heading = extractHeading(block);
    if (!heading) continue;
    const section = { heading };
    const paragraphs = extractParagraphs(block);
    const bullets = extractBullets(block);
    const formula = extractFormula(block);
    const note = extractNote(block);
    const table = extractTable(block);
    if (paragraphs.length) section.paragraphs = paragraphs;
    if (bullets.length) section.bullets = bullets;
    if (formula) section.formula = formula;
    if (note) section.note = note;
    if (table) section.table = table;
    result.push(section);
  }
  return result;
}

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const extracted = {};

for (const [file, slug] of Object.entries(SLUG_BY_FILE)) {
  const path = join(componentsDir, `${file}.tsx`);
  const content = readFileSync(path, 'utf8');
  const sections = parseCalculator(content);
  extracted[slug] = sections;
  en.calcs[slug].education = { sections };
  console.log(`${slug}: ${sections.length} sections`);
}

writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);
writeFileSync(
  join(root, 'scripts/calc-education-extracted.json'),
  `${JSON.stringify(extracted, null, 2)}\n`,
);
console.log('Merged education into en/calculators.json');
