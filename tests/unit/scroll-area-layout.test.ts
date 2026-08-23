import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const scrollAreaSource = await readFile(
  new URL('../../src/shared/components/ui/scroll-area.tsx', import.meta.url),
  'utf8',
);

describe('ScrollArea constrained layouts', () => {
  it('overrides the Radix table wrapper so grid and flex parents can shrink it', () => {
    assert.match(
      scrollAreaSource,
      /ScrollAreaPrimitive\.Viewport className="[^"]*\[&>div\]:!block[^"]*"/,
    );
  });
});
