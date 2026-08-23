import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createEventIsPublishedSchema,
  updateEventIsPublishedSchema,
} from '../../server/src/routes/api/eventPublishSchema.ts';

describe('event isPublished schema', () => {
  it('create defaults a new event to draft (false) when omitted', () => {
    assert.equal(createEventIsPublishedSchema.parse(undefined), false);
  });

  it('create honors an explicit publish flag', () => {
    assert.equal(createEventIsPublishedSchema.parse(true), true);
    assert.equal(createEventIsPublishedSchema.parse(false), false);
  });

  it('update leaves published-state untouched when omitted (no silent unpublish)', () => {
    assert.equal(updateEventIsPublishedSchema.parse(undefined), undefined);
  });

  it('update applies the flag only when explicitly provided', () => {
    assert.equal(updateEventIsPublishedSchema.parse(true), true);
    assert.equal(updateEventIsPublishedSchema.parse(false), false);
  });
});
