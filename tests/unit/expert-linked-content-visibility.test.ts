import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMasterclassDiscoveryVisible,
  shouldIncludeLinkedEvent,
  shouldIncludeLinkedLibraryAsset,
  shouldIncludeLinkedMasterclass,
  shouldIncludeLinkedSeries,
  shouldIncludeLinkedTrack,
} from '../../server/src/services/expertLinkedContentVisibility.ts';
import {
  PRODUCT_VISIBILITY_DEFAULTS,
  resolveEffectiveProductVisibility,
} from '../../server/src/services/productVisibilityRules.ts';

describe('expert linked content visibility helpers', () => {
  const discoveryEnabled = resolveEffectiveProductVisibility({
    ...PRODUCT_VISIBILITY_DEFAULTS,
    masterclassesEnabled: true,
    masterclassesLaunched: true,
  });
  const discoveryBlocked = resolveEffectiveProductVisibility({
    ...PRODUCT_VISIBILITY_DEFAULTS,
    masterclassesEnabled: false,
    masterclassesLaunched: false,
  });

  it('includes published tracks for public viewers', () => {
    assert.equal(shouldIncludeLinkedTrack(true, false), true);
    assert.equal(shouldIncludeLinkedTrack(false, false), false);
  });

  it('includes unpublished tracks for staff viewers', () => {
    assert.equal(shouldIncludeLinkedTrack(false, true), true);
    assert.equal(shouldIncludeLinkedTrack(true, true), true);
  });

  it('includes published series for public viewers', () => {
    assert.equal(shouldIncludeLinkedSeries(true, false), true);
    assert.equal(shouldIncludeLinkedSeries(false, false), false);
  });

  it('includes unpublished series for staff viewers', () => {
    assert.equal(shouldIncludeLinkedSeries(false, true), true);
  });

  it('blocks masterclasses when module discovery is disabled', () => {
    assert.equal(isMasterclassDiscoveryVisible(discoveryEnabled), true);
    assert.equal(isMasterclassDiscoveryVisible(discoveryBlocked), false);
    assert.equal(
      shouldIncludeLinkedMasterclass(true, false, discoveryBlocked),
      false,
    );
  });

  it('includes published masterclasses when discovery is enabled', () => {
    assert.equal(
      shouldIncludeLinkedMasterclass(true, false, discoveryEnabled),
      true,
    );
    assert.equal(
      shouldIncludeLinkedMasterclass(false, false, discoveryEnabled),
      false,
    );
  });

  it('includes draft masterclasses for staff regardless of discovery', () => {
    assert.equal(
      shouldIncludeLinkedMasterclass(false, true, discoveryBlocked),
      true,
    );
  });

  it('includes only public library assets for visitors', () => {
    assert.equal(shouldIncludeLinkedLibraryAsset(true, false), true);
    assert.equal(shouldIncludeLinkedLibraryAsset(false, false), false);
    assert.equal(shouldIncludeLinkedLibraryAsset(false, true), true);
  });

  it('includes published events for public viewers', () => {
    assert.equal(shouldIncludeLinkedEvent(true, false), true);
    assert.equal(shouldIncludeLinkedEvent(false, false), false);
    assert.equal(shouldIncludeLinkedEvent(false, true), true);
  });
});
