import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeRichTextHtml,
  slugifyExpert,
} from '../../server/src/utils/expertContent.ts';

describe('expert content sanitization', () => {
  it('strips script tags from rich text bio', () => {
    const input = '<p>Hello</p><script>alert(1)</script>';
    assert.equal(sanitizeRichTextHtml(input), '<p>Hello</p>');
  });

  it('blocks javascript URLs', () => {
    assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeExternalUrl('https://example.com'), 'https://example.com/');
  });

  it('sanitizes plain headline length', () => {
    const long = 'a'.repeat(400);
    assert.equal(sanitizePlainText(long, 300)?.length, 300);
  });

  it('slugifies display names deterministically', () => {
    assert.equal(slugifyExpert('Ahmed Hassan'), 'ahmed-hassan');
    assert.equal(slugifyExpert('  '), 'expert');
  });
});

describe('expert permission policy helpers', () => {
  it('treats archived experts as not publicly visible', async () => {
    const { isExpertPubliclyVisible } = await import('../../server/src/services/experts.ts');
    assert.equal(isExpertPubliclyVisible({ isPublished: true, archivedAt: new Date() }), false);
    assert.equal(isExpertPubliclyVisible({ isPublished: true, archivedAt: null }), true);
    assert.equal(isExpertPubliclyVisible({ isPublished: false, archivedAt: null }), false);
  });
});
