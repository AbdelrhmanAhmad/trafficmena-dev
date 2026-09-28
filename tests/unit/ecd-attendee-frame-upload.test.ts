import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

/**
 * Regression: React admin/portal frame save used fetch(dataUrl) to build a Blob.
 * Hub CSP connect-src does not allow data: URLs → TypeError "Failed to fetch".
 * HTML checkout already used atob(); the SPA must do the same.
 */
describe('ECD attendee frame client upload', () => {
  it('converts data URL via atob, not fetch(data:…)', async () => {
    const source = await readFile(new URL('../../src/app/api/ecd.ts', import.meta.url), 'utf8');
    const start = source.indexOf('export function dataUrlToBlob');
    const upload = source.indexOf('export async function uploadEcdAttendeeFrame');
    assert.ok(start > 0, 'dataUrlToBlob helper must exist');
    assert.ok(upload > start, 'uploadEcdAttendeeFrame must follow dataUrlToBlob');

    const helper = source.slice(start, upload);
    assert.ok(helper.includes('atob('), 'dataUrlToBlob must decode with atob');
    assert.equal(
      /fetch\s*\(\s*(imageDataUrl|dataUrl)/.test(helper),
      false,
      'dataUrlToBlob must not fetch the data URL (CSP blocks data: connect-src)',
    );

    const fn = source.slice(upload, upload + 900);
    assert.ok(fn.includes('dataUrlToBlob('), 'upload must use dataUrlToBlob');
    assert.equal(
      /fetch\s*\(\s*imageDataUrl/.test(fn),
      false,
      'upload must not fetch(imageDataUrl)',
    );
    assert.ok(fn.includes('FormData'), 'upload must send multipart FormData');
  });
});
