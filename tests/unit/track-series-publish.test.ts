import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldPublishTrackSeries } from '../../server/src/routes/api/trackSeriesPublishing.ts';

describe('track series publishing', () => {
  it('publishes the series when a track transitions to published', () => {
    const shouldPublish = shouldPublishTrackSeries({
      previousIsPublished: false,
      nextIsPublished: true,
    });

    assert.equal(shouldPublish, true);
  });

  it('does not publish when track is already published', () => {
    const shouldPublish = shouldPublishTrackSeries({
      previousIsPublished: true,
      nextIsPublished: true,
    });

    assert.equal(shouldPublish, false);
  });

  it('does not publish when track stays unpublished', () => {
    const shouldPublish = shouldPublishTrackSeries({
      previousIsPublished: false,
      nextIsPublished: false,
    });

    assert.equal(shouldPublish, false);
  });

  it('does not publish when update omits isPublished', () => {
    const shouldPublish = shouldPublishTrackSeries({
      previousIsPublished: false,
      nextIsPublished: undefined,
    });

    assert.equal(shouldPublish, false);
  });
});
