import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/features/calculators/components');
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.tsx')) continue;
  const p = join(dir, file);
  let c = readFileSync(p, 'utf8');
  if (!c.includes("t('") && !c.includes('t("')) continue;
  if (c.includes("const { t } = useTranslation('calculators')")) continue;
  if (!c.includes("from 'react-i18next'")) {
    c = c.replace(/^import /m, "import { useTranslation } from 'react-i18next';\nimport ");
  }
  c = c.replace(
    /(const \w+ = \(\) => \{\r?\n)/,
    "$1  const { t } = useTranslation('calculators');\r\n",
  );
  writeFileSync(p, c);
  console.log('added t hook to', file);
}
