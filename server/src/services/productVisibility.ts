import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { platformSettings } from '../db/schema/index.js';
import {
  buildLaunchUpdateOnFirstPublish,
  mergeVisibilityPatch,
  PRODUCT_VISIBILITY_DEFAULTS,
  resolveEffectiveProductVisibility,
  type EffectiveProductVisibility,
  type ProductVisibilityRecord,
} from './productVisibilityRules.js';

export type { CheckoutItemKind, EffectiveProductVisibility, ProductVisibilityRecord } from './productVisibilityRules.js';
export {
  assertCanDisableModule,
  assertCheckoutAllowed,
  buildLaunchUpdateOnFirstPublish,
  isDiscoveryBlocked,
  mergeVisibilityPatch,
  PRODUCT_VISIBILITY_DEFAULTS,
  resolveEffectiveProductVisibility,
  toVisibilityRecordFromSettings,
} from './productVisibilityRules.js';

export async function fetchProductVisibilityRecord(): Promise<ProductVisibilityRecord | null> {
  const [record] = await db
    .select({
      subscriptionsEnabled: platformSettings.subscriptionsEnabled,
      masterclassesEnabled: platformSettings.masterclassesEnabled,
      digitalProductsEnabled: platformSettings.digitalProductsEnabled,
      masterclassesLaunched: platformSettings.masterclassesLaunched,
      digitalProductsLaunched: platformSettings.digitalProductsLaunched,
    })
    .from(platformSettings)
    .limit(1);

  return record ?? null;
}

export async function getEffectiveProductVisibility(): Promise<EffectiveProductVisibility> {
  const record = await fetchProductVisibilityRecord();
  return resolveEffectiveProductVisibility(record);
}

export async function applyFirstPublishLaunch(
  module: 'masterclasses' | 'digitalProducts',
  wasPublished: boolean,
  willBePublished: boolean,
): Promise<void> {
  const launchUpdate = buildLaunchUpdateOnFirstPublish(module, wasPublished, willBePublished);
  if (!launchUpdate) return;

  const [row] = await db.select({ id: platformSettings.id }).from(platformSettings).limit(1);
  const now = new Date();

  if (row) {
    await db
      .update(platformSettings)
      .set({
        ...launchUpdate,
        updatedAt: now,
      })
      .where(eq(platformSettings.id, row.id));
    return;
  }

  await db.insert(platformSettings).values({
    ...PRODUCT_VISIBILITY_DEFAULTS,
    ...launchUpdate,
    updatedAt: now,
  });
}
