import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterExpertsBySearch,
  resolveInitialExpertIds,
  toggleExpertSelection,
  withEventExpertIds,
} from '../../src/features/events/utils/eventExpertIds.ts';

describe('event expert picker helpers', () => {
  it('loads initial expert IDs from event detail', () => {
    assert.deepEqual(resolveInitialExpertIds(undefined), []);
    assert.deepEqual(resolveInitialExpertIds({ expert_ids: ['a', 'b'] }), ['a', 'b']);
  });

  it('merges selected expert IDs into create/update payload', () => {
    const payload = {
      titleEn: 'Test',
      titleAr: 'اختبار',
      date: '2026-12-01T10:00:00.000Z',
      eventType: 'Event' as const,
      eventFormat: 'online' as const,
      isPublished: false,
    };
    const merged = withEventExpertIds(payload, ['expert-1', 'expert-2']);
    assert.deepEqual(merged.expertIds, ['expert-1', 'expert-2']);
    assert.equal(merged.titleEn, 'Test');
  });

  it('adds and removes expert selections without duplicates', () => {
    let selected = ['a'];
    selected = toggleExpertSelection(selected, 'b', true);
    selected = toggleExpertSelection(selected, 'a', true);
    assert.deepEqual(selected, ['a', 'b']);
    selected = toggleExpertSelection(selected, 'a', false);
    assert.deepEqual(selected, ['b']);
  });

  it('filters experts by English name, Arabic name, or headline', () => {
    const experts = [
      { displayNameEn: 'Ahmed Hassan', displayNameAr: 'أحمد حسن', headlineEn: 'SEO lead' },
      { displayNameEn: 'Sara Ali', displayNameAr: 'سارة علي', headlineEn: 'Paid media' },
    ];
    assert.equal(filterExpertsBySearch(experts, 'seo').length, 1);
    assert.equal(filterExpertsBySearch(experts, 'سارة').length, 1);
    assert.equal(filterExpertsBySearch(experts, '').length, 2);
  });
});
