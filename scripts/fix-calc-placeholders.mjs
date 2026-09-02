import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '../src/features/calculators/components');

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.tsx')) continue;
  const p = join(dir, file);
  let c = readFileSync(p, 'utf8');
  const orig = c;
  c = c.replaceAll('placeholder="{t(', 'placeholder={t(');
  c = c.replaceAll('"{t(\'calcs.roas.performance.losing\')}"', "t('calcs.roas.performance.losing')");
  if (c !== orig) {
    writeFileSync(p, c);
    console.log('fixed', file);
  }
}
