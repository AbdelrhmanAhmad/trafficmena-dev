import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('GTM bootstrap CSP hardening', () => {
  it('loads GTM from a first-party bootstrap file instead of inline head scripts', async () => {
    const html = await readFile(path.join(projectRoot, 'index.html'), 'utf8');

    assert.match(html, /<script src="\/gtm-bootstrap\.js"><\/script>/);
    assert.doesNotMatch(html, /<script>window\.dataLayer = window\.dataLayer \|\| \[\];<\/script>/);
    assert.doesNotMatch(html, /script-src[^;\n]*'unsafe-inline'/);
  });

  it('keeps the server CSP script-src free of unsafe-inline', async () => {
    const serverApp = await readFile(path.join(projectRoot, 'server/src/app.ts'), 'utf8');

    const scriptSrcMatch = serverApp.match(/const scriptSrc = \[(?<content>[\s\S]*?)\];/);
    assert.ok(scriptSrcMatch?.groups?.content);
    assert.doesNotMatch(scriptSrcMatch.groups.content, /'unsafe-inline'/);
  });

  it('keeps the GTM bootstrap logic in a standalone script file', async () => {
    const bootstrapScript = await readFile(
      path.join(projectRoot, 'public', 'gtm-bootstrap.js'),
      'utf8',
    );

    assert.match(bootstrapScript, /window\[dataLayerName\] = window\[dataLayerName\] \|\| \[\];/);
    assert.match(bootstrapScript, /www\.googletagmanager\.com\/gtm\.js/);
  });
});
