import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getExpertLinkedContentHref } from '../../src/pages/experts/expertPublicLinks.ts';

const CONTENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function appRoutePaths(): string[] {
  const source = readFileSync('src/App.tsx', 'utf8');
  return [...source.matchAll(/path="([^"]+)"/g)].map((match) => match[1]);
}

describe('expert public linked content routes', () => {
  it('uses public routes for events, tracks, and series regardless of auth', () => {
    for (const kind of ['event', 'track', 'series'] as const) {
      const anonymous = getExpertLinkedContentHref(kind, CONTENT_ID, false);
      const member = getExpertLinkedContentHref(kind, CONTENT_ID, true);
      assert.equal(anonymous, member);
      assert.ok(anonymous);
    }
    assert.equal(getExpertLinkedContentHref('event', CONTENT_ID, false), `/meetups/${CONTENT_ID}`);
    assert.equal(getExpertLinkedContentHref('track', CONTENT_ID, false), `/tracks/${CONTENT_ID}`);
    assert.equal(getExpertLinkedContentHref('series', CONTENT_ID, false), `/series/${CONTENT_ID}`);
  });

  it('links masterclasses and library assets only for authenticated viewers', () => {
    assert.equal(getExpertLinkedContentHref('masterclass', CONTENT_ID, false), null);
    assert.equal(
      getExpertLinkedContentHref('masterclass', CONTENT_ID, true),
      `/dashboard/masterclasses/${CONTENT_ID}`,
    );
    assert.equal(getExpertLinkedContentHref('libraryAsset', CONTENT_ID, false), null);
    assert.equal(
      getExpertLinkedContentHref('libraryAsset', CONTENT_ID, true),
      `/dashboard/library/${CONTENT_ID}`,
    );
  });

  it('does not reference the removed /masterclasses/:id public path', () => {
    const expertPage = readFileSync('src/pages/experts/[slug].tsx', 'utf8');
    assert.doesNotMatch(expertPage, /\/masterclasses\/\$\{/);
    assert.doesNotMatch(expertPage, /to="\/masterclasses\//);
  });

  it('registers canonical App.tsx routes for expert linked destinations', () => {
    const routes = appRoutePaths();
    assert.ok(routes.includes('/meetups/:id'));
    assert.ok(routes.includes('/tracks/:id'));
    assert.ok(routes.includes('/series/:id'));
    assert.ok(routes.includes('/dashboard/masterclasses/:id'));
    assert.ok(routes.includes('/dashboard/library/:id'));
    assert.ok(!routes.includes('/masterclasses/:id'));
    assert.ok(!routes.some((path) => path === '/library/:id'));
  });
});
