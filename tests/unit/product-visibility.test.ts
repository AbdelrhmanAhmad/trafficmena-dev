import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import {
  assertCanDisableModule,
  assertCheckoutAllowed,
  buildLaunchUpdateOnFirstPublish,
  isDiscoveryBlocked,
  mergeVisibilityPatch,
  PRODUCT_VISIBILITY_DEFAULTS,
  resolveEffectiveProductVisibility,
} from '../../server/src/services/productVisibilityRules.ts';

describe('resolveEffectiveProductVisibility', () => {
  it('defaults all modules to hidden/off', () => {
    const effective = resolveEffectiveProductVisibility(null);
    assert.deepEqual(effective, PRODUCT_VISIBILITY_DEFAULTS);
  });

  it('forces digital products visible after launch lock', () => {
    const effective = resolveEffectiveProductVisibility({
      subscriptionsEnabled: false,
      masterclassesEnabled: false,
      digitalProductsEnabled: false,
      masterclassesLaunched: false,
      digitalProductsLaunched: true,
    });
    assert.equal(effective.digitalProductsEnabled, true);
  });

  it('forces masterclasses visible after launch lock', () => {
    const effective = resolveEffectiveProductVisibility({
      subscriptionsEnabled: false,
      masterclassesEnabled: false,
      digitalProductsEnabled: false,
      masterclassesLaunched: true,
      digitalProductsLaunched: false,
    });
    assert.equal(effective.masterclassesEnabled, true);
  });
});

describe('assertCanDisableModule', () => {
  it('allows disabling masterclasses before launch', () => {
    assert.doesNotThrow(() =>
      assertCanDisableModule('masterclasses', PRODUCT_VISIBILITY_DEFAULTS, false),
    );
  });

  it('rejects disabling masterclasses after launch', () => {
    assert.throws(
      () =>
        assertCanDisableModule(
          'masterclasses',
          { ...PRODUCT_VISIBILITY_DEFAULTS, masterclassesLaunched: true },
          false,
        ),
      (error: Error) => error.message.includes('Masterclasses cannot be hidden'),
    );
  });

  it('rejects disabling digital products after launch', () => {
    assert.throws(
      () =>
        assertCanDisableModule(
          'digitalProducts',
          { ...PRODUCT_VISIBILITY_DEFAULTS, digitalProductsLaunched: true },
          false,
        ),
      (error: Error & { code?: string }) => error.code === 'FEATURE_CANNOT_BE_DISABLED_AFTER_PUBLISH',
    );
  });
});

describe('buildLaunchUpdateOnFirstPublish', () => {
  it('returns launch update on first publish only', () => {
    assert.deepEqual(buildLaunchUpdateOnFirstPublish('digitalProducts', false, true), {
      digitalProductsLaunched: true,
      digitalProductsEnabled: true,
    });
    assert.equal(buildLaunchUpdateOnFirstPublish('digitalProducts', true, true), null);
    assert.equal(buildLaunchUpdateOnFirstPublish('digitalProducts', false, false), null);
  });

  it('keeps launch lock even if all items are later unpublished', () => {
    assert.throws(
      () =>
        mergeVisibilityPatch(
          {
            ...PRODUCT_VISIBILITY_DEFAULTS,
            digitalProductsLaunched: true,
            digitalProductsEnabled: true,
          },
          { digitalProductsEnabled: false },
        ),
      (error: Error & { code?: string }) => error.code === 'FEATURE_CANNOT_BE_DISABLED_AFTER_PUBLISH',
    );
  });
});

describe('assertCheckoutAllowed', () => {
  it('blocks subscription checkout when disabled', () => {
    assert.throws(
      () => assertCheckoutAllowed(PRODUCT_VISIBILITY_DEFAULTS, 'subscription'),
      (error: Error & { code?: string }) => error.code === 'FEATURE_DISABLED',
    );
  });

  it('allows subscription checkout when enabled', () => {
    assert.doesNotThrow(() =>
      assertCheckoutAllowed(
        { ...PRODUCT_VISIBILITY_DEFAULTS, subscriptionsEnabled: true },
        'subscription',
      ),
    );
  });

  it('blocks masterclass checkout when disabled', () => {
    assert.throws(() => assertCheckoutAllowed(PRODUCT_VISIBILITY_DEFAULTS, 'masterclass'));
  });

  it('blocks digital product orders when disabled', () => {
    assert.throws(() =>
      assertCheckoutAllowed(PRODUCT_VISIBILITY_DEFAULTS, 'digital_product_order'),
    );
  });
});

describe('isDiscoveryBlocked', () => {
  it('blocks public discovery when module disabled', () => {
    assert.equal(isDiscoveryBlocked('digitalProducts', PRODUCT_VISIBILITY_DEFAULTS), true);
    assert.equal(isDiscoveryBlocked('masterclasses', PRODUCT_VISIBILITY_DEFAULTS), true);
  });

  it('does not block discovery when module enabled', () => {
    const enabled = {
      ...PRODUCT_VISIBILITY_DEFAULTS,
      digitalProductsEnabled: true,
      masterclassesEnabled: true,
    };
    assert.equal(isDiscoveryBlocked('digitalProducts', enabled), false);
    assert.equal(isDiscoveryBlocked('masterclasses', enabled), false);
  });
});

describe('product visibility route wiring', () => {
  it('enforces digital product public routes behind visibility checks', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/digitalProducts.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /isDiscoveryBlocked\('digitalProducts'/);
    assert.match(source, /applyFirstPublishLaunch\('digitalProducts'/);
  });

  it('enforces masterclass store routes behind visibility checks', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/masterclasses.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /isDiscoveryBlocked\('masterclasses'/);
    assert.match(source, /applyFirstPublishLaunch\('masterclasses'/);
  });

  it('enforces checkout visibility in payments calculatePrice', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/payments.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /assertCheckoutAllowed\(visibility, 'subscription'\)/);
    assert.match(source, /assertCheckoutAllowed\(visibility, 'masterclass'\)/);
    assert.match(source, /assertCheckoutAllowed\(visibility, 'digital_product_order'\)/);
  });

  it('exposes subscriptionsEnabled on public settings', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/settings.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /subscriptionsEnabled/);
  });

  it('requires admin for module settings patch', async () => {
    const source = await readFile(
      new URL('../../server/src/routes/api/settings.ts', import.meta.url),
      'utf8',
    );
    assert.match(source, /requireAdmin\(c\)/);
  });
});
