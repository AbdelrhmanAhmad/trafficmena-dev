import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/features/calculators/components');
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.tsx')) continue;
  const p = join(dir, file);
  let c = readFileSync(p, 'utf8');
  const n = c.replace(/\)\}"/g, ")}");
  if (n !== c) {
    writeFileSync(p, n);
    console.log('fixed', file);
  }
}
