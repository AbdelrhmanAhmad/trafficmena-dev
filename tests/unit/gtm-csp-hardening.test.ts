import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const getMetaDirective = (html: string, directive: string) => {
  const match = html.match(new RegExp(`${directive}\\s+(?<content>[^;]+);`));
  assert.ok(match?.groups?.content, `Missing ${directive} in the meta CSP`);
  return match.groups.content;
};

const getServerArray = (serverApp: string, property: string) => {
  const match = serverApp.match(new RegExp(`${property}: \\[(?<content>[\\s\\S]*?)\\],`));
  assert.ok(match?.groups?.content, `Missing ${property} in the server CSP`);
  return match.groups.content;
};

describe('GTM bootstrap CSP hardening', () => {
  it('loads GTM from a first-party bootstrap file instead of inline head scripts', async () => {
    const html = await readFile(path.join(projectRoot, 'index.html'), 'utf8');

    assert.match(html, /<script src="\/gtm-bootstrap\.js"><\/script>/);
    assert.doesNotMatch(html, /<script>window\.dataLayer = window\.dataLayer \|\| \[\];<\/script>/);
    assert.doesNotMatch(html, /script-src[^;\n]*'unsafe-inline'/);
  });

  it('applies the meta CSP before scripts and resource-fetching tags', async () => {
    const html = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
    const cspPosition = html.indexOf('http-equiv="Content-Security-Policy"');
    const firstResourcePosition = html.search(/<(?:script|link|iframe)\b/);

    assert.notEqual(cspPosition, -1);
    assert.notEqual(firstResourcePosition, -1);
    assert.ok(cspPosition < firstResourcePosition);
    assert.match(
      html,
      /<meta name="viewport"[^>]*\/?>\s*(?:<!--[\s\S]*?-->\s*)*<meta\s+http-equiv="Content-Security-Policy"/,
    );
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

  // The meta CSP governs the SPA document while Hono's CSP governs API responses. Keep
  // shared vendor hosts synchronized for defense-in-depth and CI coverage.
  it('pins key tracking pixel hosts in both CSP locations', async () => {
    const [html, serverApp] = await Promise.all([
      readFile(path.join(projectRoot, 'index.html'), 'utf8'),
      readFile(path.join(projectRoot, 'server/src/app.ts'), 'utf8'),
    ]);

    // Google Ads /ccm/collect beacon (the original reported block)
    assert.match(html, /www\.google\.com/);
    assert.match(serverApp, /www\.google\.com/);
    // Meta Pixel
    assert.match(html, /connect\.facebook\.net/);
    assert.match(serverApp, /connect\.facebook\.net/);
    // TikTok Pixel
    assert.match(html, /analytics\.tiktok\.com/);
    assert.match(serverApp, /analytics\.tiktok\.com/);
  });

  it('allows Microsoft Clarity only in its required CSP directives', async () => {
    const [html, serverApp] = await Promise.all([
      readFile(path.join(projectRoot, 'index.html'), 'utf8'),
      readFile(path.join(projectRoot, 'server/src/app.ts'), 'utf8'),
    ]);

    assert.match(getMetaDirective(html, 'script-src'), /https:\/\/www\.clarity\.ms/);
    assert.match(getMetaDirective(html, 'script-src'), /https:\/\/\*\.clarity\.ms/);
    assert.match(getMetaDirective(html, 'connect-src'), /https:\/\/\*\.clarity\.ms/);
    assert.match(getMetaDirective(html, 'connect-src'), /https:\/\/c\.bing\.com/);
    assert.match(getMetaDirective(html, 'frame-src'), /https:\/\/www\.clarity\.ms/);
    assert.match(getMetaDirective(html, 'worker-src'), /https:\/\/www\.clarity\.ms/);

    const scriptSrcMatch = serverApp.match(/const scriptSrc = \[(?<content>[\s\S]*?)\];/);
    assert.ok(scriptSrcMatch?.groups?.content);
    assert.match(scriptSrcMatch.groups.content, /https:\/\/www\.clarity\.ms/);
    assert.match(scriptSrcMatch.groups.content, /https:\/\/\*\.clarity\.ms/);

    const connectSourcesMatch = serverApp.match(
      /const connectSources = new Set<string>\((?<content>[\s\S]*?)\n\s*const scriptSrc/,
    );
    assert.ok(connectSourcesMatch?.groups?.content);
    assert.match(connectSourcesMatch.groups.content, /https:\/\/\*\.clarity\.ms/);
    assert.match(connectSourcesMatch.groups.content, /https:\/\/c\.bing\.com/);
    assert.match(getServerArray(serverApp, 'frameSrc'), /https:\/\/www\.clarity\.ms/);
    assert.match(getServerArray(serverApp, 'workerSrc'), /https:\/\/www\.clarity\.ms/);
  });
});
