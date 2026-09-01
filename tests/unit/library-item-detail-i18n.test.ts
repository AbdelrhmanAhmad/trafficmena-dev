import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const libraryItemDetail = readFileSync(
  join(import.meta.dirname, '../../src/pages/LibraryItemDetail.tsx'),
  'utf8',
);

describe('LibraryItemDetail i18n wiring', () => {
  it('uses library.itemDetail keys for main content surface', () => {
    assert.match(libraryItemDetail, /useTranslation\('library'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.videoContent'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.presentation'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.document'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.download'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.details'\)/);
    assert.match(libraryItemDetail, /t\('itemDetail\.addedOn'/);
    assert.doesNotMatch(libraryItemDetail, />Video Content</);
    assert.doesNotMatch(libraryItemDetail, />Back to Series</);
    assert.doesNotMatch(libraryItemDetail, />Document Attached</);
  });

  it('uses RTL-aware back navigation styling', () => {
    assert.match(libraryItemDetail, /me-2 h-4 w-4 rtl:rotate-180/);
    assert.doesNotMatch(libraryItemDetail, /mr-2 h-4 w-4/);
  });
});
