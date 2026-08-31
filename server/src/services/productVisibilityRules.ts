import { ApiError } from '../utils/errors.js';

export type ProductVisibilityRecord = {
  subscriptionsEnabled: boolean;
  masterclassesEnabled: boolean;
  digitalProductsEnabled: boolean;
  masterclassesLaunched: boolean;
  digitalProductsLaunched: boolean;
};

export const PRODUCT_VISIBILITY_DEFAULTS: ProductVisibilityRecord = {
  subscriptionsEnabled: false,
  masterclassesEnabled: false,
  digitalProductsEnabled: false,
  masterclassesLaunched: false,
  digitalProductsLaunched: false,
};

export type EffectiveProductVisibility = ProductVisibilityRecord;

export function resolveEffectiveProductVisibility(
  record: ProductVisibilityRecord | null | undefined,
): EffectiveProductVisibility {
  const base = record ?? PRODUCT_VISIBILITY_DEFAULTS;
  return {
    subscriptionsEnabled: base.subscriptionsEnabled,
    masterclassesEnabled: base.masterclassesLaunched || base.masterclassesEnabled,
    digitalProductsEnabled: base.digitalProductsLaunched || base.digitalProductsEnabled,
    masterclassesLaunched: base.masterclassesLaunched,
    digitalProductsLaunched: base.digitalProductsLaunched,
  };
}

export function assertCanDisableModule(
  module: 'masterclasses' | 'digitalProducts',
  current: ProductVisibilityRecord,
  requestedEnabled: boolean,
): void {
  if (requestedEnabled) return;

  if (module === 'masterclasses' && current.masterclassesLaunched) {
    throw new ApiError(
      'FEATURE_CANNOT_BE_DISABLED_AFTER_PUBLISH',
      'Masterclasses cannot be hidden after the first published masterclass.',
      409,
    );
  }

  if (module === 'digitalProducts' && current.digitalProductsLaunched) {
    throw new ApiError(
      'FEATURE_CANNOT_BE_DISABLED_AFTER_PUBLISH',
      'Digital Products cannot be hidden after the first published product.',
      409,
    );
  }
}

export function buildLaunchUpdateOnFirstPublish(
  module: 'masterclasses' | 'digitalProducts',
  wasPublished: boolean,
  willBePublished: boolean,
): Partial<ProductVisibilityRecord> | null {
  if (!willBePublished || wasPublished) return null;

  if (module === 'masterclasses') {
    return { masterclassesLaunched: true, masterclassesEnabled: true };
  }

  return { digitalProductsLaunched: true, digitalProductsEnabled: true };
}

export type CheckoutItemKind = 'subscription' | 'masterclass' | 'digital_product_order';

export function assertCheckoutAllowed(
  effective: EffectiveProductVisibility,
  itemKind: CheckoutItemKind,
): void {
  if (itemKind === 'subscription' && !effective.subscriptionsEnabled) {
    throw new ApiError('FEATURE_DISABLED', 'Subscriptions are not available.', 403);
  }

  if (itemKind === 'masterclass' && !effective.masterclassesEnabled) {
    throw new ApiError('FEATURE_DISABLED', 'Masterclasses are not available.', 403);
  }

  if (itemKind === 'digital_product_order' && !effective.digitalProductsEnabled) {
    throw new ApiError('FEATURE_DISABLED', 'Digital Products are not available.', 403);
  }
}

export function isDiscoveryBlocked(
  module: 'masterclasses' | 'digitalProducts',
  effective: EffectiveProductVisibility,
): boolean {
  if (module === 'masterclasses') return !effective.masterclassesEnabled;
  return !effective.digitalProductsEnabled;
}

export function mergeVisibilityPatch(
  current: ProductVisibilityRecord | null,
  patch: Partial<ProductVisibilityRecord>,
): ProductVisibilityRecord {
  const base = current ?? PRODUCT_VISIBILITY_DEFAULTS;
  const nextMasterclassesEnabled = patch.masterclassesEnabled ?? base.masterclassesEnabled;
  const nextDigitalProductsEnabled = patch.digitalProductsEnabled ?? base.digitalProductsEnabled;

  assertCanDisableModule('masterclasses', base, nextMasterclassesEnabled);
  assertCanDisableModule('digitalProducts', base, nextDigitalProductsEnabled);

  return {
    subscriptionsEnabled: patch.subscriptionsEnabled ?? base.subscriptionsEnabled,
    masterclassesEnabled: base.masterclassesLaunched ? true : nextMasterclassesEnabled,
    digitalProductsEnabled: base.digitalProductsLaunched ? true : nextDigitalProductsEnabled,
    masterclassesLaunched: base.masterclassesLaunched,
    digitalProductsLaunched: base.digitalProductsLaunched,
  };
}

export function toVisibilityRecordFromSettings(
  settings:
    | {
        subscriptionsEnabled: boolean;
        masterclassesEnabled: boolean;
        digitalProductsEnabled: boolean;
        masterclassesLaunched: boolean;
        digitalProductsLaunched: boolean;
      }
    | null
    | undefined,
): ProductVisibilityRecord | null {
  if (!settings) return null;
  return {
    subscriptionsEnabled: settings.subscriptionsEnabled,
    masterclassesEnabled: settings.masterclassesEnabled,
    digitalProductsEnabled: settings.digitalProductsEnabled,
    masterclassesLaunched: settings.masterclassesLaunched,
    digitalProductsLaunched: settings.digitalProductsLaunched,
  };
}
