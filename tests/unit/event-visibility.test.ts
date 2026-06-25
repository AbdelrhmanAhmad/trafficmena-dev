import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isEventHiddenFromNonStaff } from '../../server/src/routes/api/eventVisibility.ts';

describe('isEventHiddenFromNonStaff (D-1 booking-path draft guard)', () => {
  it('hides a draft event from non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: false,
        linkedTrackIsPublished: null,
        isStaff: false,
      }),
      true,
    );
  });

  it('hides a published event whose linked track is unpublished', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: false,
        isStaff: false,
      }),
      true,
    );
  });

  it('shows a published standalone event to non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: null,
        isStaff: false,
      }),
      false,
    );
  });

  it('shows a published event in a published track to non-staff', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: true,
        isStaff: false,
      }),
      false,
    );
  });

  it('lets staff through even for a draft event', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: false,
        linkedTrackIsPublished: null,
        isStaff: true,
      }),
      false,
    );
  });

  it('lets staff through even when the linked track is unpublished', () => {
    assert.equal(
      isEventHiddenFromNonStaff({
        isPublished: true,
        linkedTrackIsPublished: false,
        isStaff: true,
      }),
      false,
    );
  });
});
