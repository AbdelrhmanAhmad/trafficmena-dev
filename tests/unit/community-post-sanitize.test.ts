import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  sanitizeExternalUrl,
  sanitizePlainText,
  sanitizeRichTextHtml,
  slugifyChannel,
  COMMUNITY_POST_TITLE_MAX,
} from '../../server/src/utils/communityContent.ts';

describe('community post sanitization', () => {
  it('strips script tags from rich text', () => {
    const input = '<p>Hello</p><script>alert(1)</script>';
    assert.equal(sanitizeRichTextHtml(input), '<p>Hello</p>');
  });

  it('blocks javascript and data URLs', () => {
    assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeExternalUrl('data:text/html,alert(1)'), null);
    assert.equal(sanitizeExternalUrl('https://example.com'), 'https://example.com/');
  });

  it('strips event handler attributes from rich text', () => {
    const input = '<p onclick="evil()">Hello</p><img src=x onerror="alert(1)">';
    const sanitized = sanitizeRichTextHtml(input);
    assert.ok(!sanitized.includes('onerror'));
    assert.ok(!sanitized.includes('onclick'));
  });

  it('sanitizes plain title length', () => {
    const long = 'a'.repeat(400);
    assert.equal(sanitizePlainText(long, COMMUNITY_POST_TITLE_MAX)?.length, COMMUNITY_POST_TITLE_MAX);
  });

  it('slugifies channel names deterministically', () => {
    assert.equal(slugifyChannel('General Discussion'), 'general-discussion');
    assert.equal(slugifyChannel('  '), 'channel');
  });
});
