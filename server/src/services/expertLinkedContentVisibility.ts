import type { EffectiveProductVisibility } from './productVisibilityRules.js';
import { isDiscoveryBlocked } from './productVisibilityRules.js';

export function isMasterclassDiscoveryVisible(
  effectiveVisibility: EffectiveProductVisibility,
): boolean {
  return !isDiscoveryBlocked('masterclasses', effectiveVisibility);
}

export function shouldIncludeLinkedTrack(isPublished: boolean, isStaff: boolean): boolean {
  return isStaff || isPublished;
}

export function shouldIncludeLinkedSeries(isPublished: boolean, isStaff: boolean): boolean {
  return isStaff || isPublished;
}

export function shouldIncludeLinkedMasterclass(
  isPublished: boolean,
  isStaff: boolean,
  effectiveVisibility: EffectiveProductVisibility,
): boolean {
  if (isStaff) return true;
  if (!isPublished) return false;
  return isMasterclassDiscoveryVisible(effectiveVisibility);
}

export function shouldIncludeLinkedLibraryAsset(isPublic: boolean, isStaff: boolean): boolean {
  return isStaff || isPublic;
}

export function shouldIncludeLinkedEvent(isPublished: boolean, isStaff: boolean): boolean {
  return isStaff || isPublished;
}
