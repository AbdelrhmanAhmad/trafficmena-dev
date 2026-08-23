import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

// Regression: publishing a ticketed track that lacks the matching session format returns a precise
// 400 (e.g. "An offline ticket is enabled but this track has no offline session."). The admin form
// must SHOW that server message — the original useUpdateTrack onError hard-coded a generic
// "Could not update track. Please try again." toast, hiding the only actionable hint and leaving
// admins stuck in a retry loop. Every track write mutation must surface error.message like its
// siblings (useCreateTrack/useDeleteTrack already do).

const hookSource = await readFile(
  new URL('../../src/features/tracks/hooks/useTracks.ts', import.meta.url),
  'utf8',
);

/** The body of a `useXxx` mutation hook, from its declaration to the next `export const`. */
function mutationBody(name: string): string {
  const start = hookSource.indexOf(`export const ${name} =`);
  assert.ok(start >= 0, `${name} not found`);
  const next = hookSource.indexOf('export const ', start + 1);
  return hookSource.slice(start, next === -1 ? undefined : next);
}

describe('track mutations surface the server error message', () => {
  for (const name of ['useCreateTrack', 'useUpdateTrack', 'useDeleteTrack']) {
    it(`${name} renders error.message in its onError toast`, () => {
      const body = mutationBody(name);
      assert.match(
        body,
        /error instanceof Error \? error\.message/,
        `${name}.onError must surface the server message, not a hard-coded generic string`,
      );
    });
  }
});
