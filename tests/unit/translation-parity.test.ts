import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, '../../src/shared/i18n/locales');

const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'events',
  'tracks',
  'library',
  'commerce',
  'payments',
  'dashboard',
  'calendar',
  'errors',
  'legal',
  'calculators',
] as const;

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function loadLocaleFile(locale: 'en' | 'ar', namespace: string): JsonObject {
  const filePath = join(localesRoot, locale, `${namespace}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as JsonObject;
}

function collectKeyPaths(value: JsonValue, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const paths: string[] = [];
  for (const key of Object.keys(value).sort()) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    const child = value[key];
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      paths.push(...collectKeyPaths(child, nextPrefix));
    } else {
      paths.push(nextPrefix);
    }
  }
  return paths;
}

function diffKeys(left: string[], right: string[]): { missingInRight: string[]; missingInLeft: string[] } {
  const rightSet = new Set(right);
  const leftSet = new Set(left);
  return {
    missingInRight: left.filter((key) => !rightSet.has(key)),
    missingInLeft: right.filter((key) => !leftSet.has(key)),
  };
}

describe('translation key parity (en/ar)', () => {
  for (const namespace of NAMESPACES) {
    it(`matches key structure for namespace "${namespace}"`, () => {
      const enKeys = collectKeyPaths(loadLocaleFile('en', namespace));
      const arKeys = collectKeyPaths(loadLocaleFile('ar', namespace));
      const { missingInRight, missingInLeft } = diffKeys(enKeys, arKeys);

      assert.deepEqual(
        missingInRight,
        [],
        `ar/${namespace}.json is missing keys: ${missingInRight.join(', ')}`,
      );
      assert.deepEqual(
        missingInLeft,
        [],
        `en/${namespace}.json is missing keys: ${missingInLeft.join(', ')}`,
      );
    });
  }
});
