import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

function readEnvValue(source: string, key: string) {
  const prefix = `${key}=`;
  const line = source.split(/\r?\n/).find((candidate) => candidate.startsWith(prefix));
  return line?.slice(prefix.length).trim();
}

describe('development origin configuration', () => {
  it('trusts the Vite development origin in the server environment example', async () => {
    const [viteConfig, envExample] = await Promise.all([
      readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../server/.env.example', import.meta.url), 'utf8'),
    ]);
    const host = viteConfig.match(/\bhost:\s*['"]([^'"]+)['"]/)?.[1];
    const port = viteConfig.match(/\bport:\s*(\d+)/)?.[1];
    const strictPort = viteConfig.match(/\bstrictPort:\s*(true|false)/)?.[1];

    assert.ok(host, 'vite.config.ts must declare the development server host');
    assert.ok(port, 'vite.config.ts must declare the development server port');
    assert.equal(
      strictPort,
      'true',
      'Vite must fail when its configured port is occupied instead of changing the trusted origin',
    );

    const viteOrigin = `http://${host}:${port}`;
    const corsOrigins = (readEnvValue(envExample, 'CORS_ORIGIN') ?? '')
      .split(',')
      .map((origin) => origin.trim());

    assert.ok(
      corsOrigins.includes(viteOrigin),
      `CORS_ORIGIN must include the Vite development origin ${viteOrigin}`,
    );
    assert.equal(
      readEnvValue(envExample, 'APP_BASE_URL'),
      viteOrigin,
      'APP_BASE_URL must match the Vite development origin',
    );
  });
});
