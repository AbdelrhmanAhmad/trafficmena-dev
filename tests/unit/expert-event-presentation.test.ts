import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatGuestExpertsPresentation } from '../../server/src/utils/expertEventPresentation.ts';

describe('event guest expert public presentation', () => {
  const publishedExpert = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'published-expert',
    displayNameEn: 'Published Expert',
    displayNameAr: 'خبير منشور',
    headlineEn: null,
    headlineAr: null,
    bioEn: 'Bio EN',
    bioAr: 'Bio AR',
    avatarUrl: 'https://example.com/p.jpg',
    websiteUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    isPublished: true,
    archivedAt: null,
    sortOrder: 0,
  };

  const draftExpert = {
    ...publishedExpert,
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'draft-expert',
    displayNameEn: 'Draft Expert',
    isPublished: false,
  };

  it('hides draft linked experts from public event presentation', () => {
    const publicView = formatGuestExpertsPresentation(
      [publishedExpert, draftExpert],
      [],
      'en',
      false,
    );
    assert.equal(publicView.length, 1);
    assert.equal(publicView[0].name, 'Published Expert');
    assert.equal(publicView[0].slug, 'published-expert');
    assert.equal(publicView[0].expertId, publishedExpert.id);
    assert.equal('expertId' in (publicView[0] as Record<string, unknown>), true);
  });

  it('shows draft experts to staff in admin presentation', () => {
    const staffView = formatGuestExpertsPresentation(
      [publishedExpert, draftExpert],
      [],
      'en',
      true,
    );
    assert.equal(staffView.length, 2);
    assert.equal(staffView[1].nameEn, 'Draft Expert');
    assert.equal(staffView[1].isPublished, false);
  });

  it('falls back to legacy guestExperts JSON when no normalized links exist', () => {
    const legacy = [
      {
        name_en: 'Legacy Guest',
        name_ar: 'ضيف قديم',
        bio_en: 'Legacy bio',
        bio_ar: 'سيرة قديمة',
        image_url: null,
      },
    ];
    const publicView = formatGuestExpertsPresentation([], legacy, 'ar', false);
    assert.equal(publicView.length, 1);
    assert.equal(publicView[0].name, 'ضيف قديم');
  });
});
