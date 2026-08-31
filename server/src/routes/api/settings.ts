import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { platformSettings } from '../../db/schema/index.js';
import {
  fetchProductVisibilityRecord,
  mergeVisibilityPatch,
  PRODUCT_VISIBILITY_DEFAULTS,
  resolveEffectiveProductVisibility,
} from '../../services/productVisibility.js';
import { ApiError, respondError } from '../../utils/errors.js';
import { requireAdmin } from './utils.js';

type SettingsRecord = {
  id: string;
  inviteOnlySignup: boolean;
  eventMode: boolean;
  masterclassesEnabled: boolean;
  digitalProductsEnabled: boolean;
  libraryStoreEnabled: boolean;
  subscriptionsEnabled: boolean;
  masterclassesLaunched: boolean;
  digitalProductsLaunched: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
};

async function fetchSettings(): Promise<SettingsRecord | null> {
  const [record] = await db
    .select({
      id: platformSettings.id,
      inviteOnlySignup: platformSettings.inviteOnlySignup,
      eventMode: platformSettings.eventMode,
      masterclassesEnabled: platformSettings.masterclassesEnabled,
      digitalProductsEnabled: platformSettings.digitalProductsEnabled,
      libraryStoreEnabled: platformSettings.libraryStoreEnabled,
      subscriptionsEnabled: platformSettings.subscriptionsEnabled,
      masterclassesLaunched: platformSettings.masterclassesLaunched,
      digitalProductsLaunched: platformSettings.digitalProductsLaunched,
      updatedAt: platformSettings.updatedAt,
      updatedBy: platformSettings.updatedBy,
    })
    .from(platformSettings)
    .limit(1);

  if (!record) {
    return null;
  }

  return record;
}

function toPublicPayload(record: SettingsRecord | null) {
  const effective = resolveEffectiveProductVisibility(
    record
      ? {
          subscriptionsEnabled: record.subscriptionsEnabled,
          masterclassesEnabled: record.masterclassesEnabled,
          digitalProductsEnabled: record.digitalProductsEnabled,
          masterclassesLaunched: record.masterclassesLaunched,
          digitalProductsLaunched: record.digitalProductsLaunched,
        }
      : null,
  );
  return {
    inviteOnly: record?.inviteOnlySignup ?? false,
    subscriptionsEnabled: effective.subscriptionsEnabled,
    masterclassesEnabled: effective.masterclassesEnabled,
    digitalProductsEnabled: effective.digitalProductsEnabled,
    libraryStoreEnabled: record?.libraryStoreEnabled ?? false,
  };
}

function toAdminPayload(record: SettingsRecord | null, fallbacks?: Partial<SettingsRecord>) {
  const effective = resolveEffectiveProductVisibility(
    record
      ? {
          subscriptionsEnabled: record.subscriptionsEnabled,
          masterclassesEnabled: record.masterclassesEnabled,
          digitalProductsEnabled: record.digitalProductsEnabled,
          masterclassesLaunched: record.masterclassesLaunched,
          digitalProductsLaunched: record.digitalProductsLaunched,
        }
      : fallbacks
        ? {
            subscriptionsEnabled: fallbacks.subscriptionsEnabled ?? false,
            masterclassesEnabled: fallbacks.masterclassesEnabled ?? false,
            digitalProductsEnabled: fallbacks.digitalProductsEnabled ?? false,
            masterclassesLaunched: fallbacks.masterclassesLaunched ?? false,
            digitalProductsLaunched: fallbacks.digitalProductsLaunched ?? false,
          }
        : null,
  );
  return {
    inviteOnly: record?.inviteOnlySignup ?? fallbacks?.inviteOnlySignup ?? false,
    eventMode: record?.eventMode ?? fallbacks?.eventMode ?? false,
    subscriptionsEnabled: effective.subscriptionsEnabled,
    masterclassesEnabled: effective.masterclassesEnabled,
    digitalProductsEnabled: effective.digitalProductsEnabled,
    libraryStoreEnabled: record?.libraryStoreEnabled ?? fallbacks?.libraryStoreEnabled ?? false,
    masterclassesLaunched: record?.masterclassesLaunched ?? fallbacks?.masterclassesLaunched ?? false,
    digitalProductsLaunched:
      record?.digitalProductsLaunched ?? fallbacks?.digitalProductsLaunched ?? false,
    updatedAt: record?.updatedAt ?? null,
    updatedBy: record?.updatedBy ?? null,
  };
}

export function registerSettingsRoutes(app: Hono) {
  app.get('/settings/public', async (c) => {
    try {
      const record = await fetchSettings();
      c.header('Cache-Control', 'no-store');
      return c.json(toPublicPayload(record));
    } catch (error) {
      console.error('[settings] public fetch failed', error);
      c.header('Cache-Control', 'no-store');
      return c.json(toPublicPayload(null));
    }
  });

  app.get('/admin/settings/general', async (c) => {
    const result = await requireAdmin(c);
    if ('response' in result) {
      return result.response;
    }

    try {
      const record = await fetchSettings();
      return c.json(toAdminPayload(record));
    } catch (error) {
      console.error('[settings] admin fetch failed', error);
      return c.json(toAdminPayload(null), 200);
    }
  });

  app.patch('/admin/settings/general', async (c) => {
    const result = await requireAdmin(c);
    if ('response' in result) {
      return result.response;
    }

    const settingsSchema = z
      .object({
        inviteOnly: z.boolean().optional(),
        eventMode: z.boolean().optional(),
        subscriptionsEnabled: z.boolean().optional(),
        masterclassesEnabled: z.boolean().optional(),
        digitalProductsEnabled: z.boolean().optional(),
        libraryStoreEnabled: z.boolean().optional(),
      })
      .refine(
        (data) =>
          data.inviteOnly !== undefined ||
          data.eventMode !== undefined ||
          data.subscriptionsEnabled !== undefined ||
          data.masterclassesEnabled !== undefined ||
          data.digitalProductsEnabled !== undefined ||
          data.libraryStoreEnabled !== undefined,
        'At least one setting must be provided.',
      );

    const bodyResult = await c.req
      .json()
      .then((payload) => settingsSchema.safeParse(payload))
      .catch(() => ({ success: false as const, error: null }));

    if (!bodyResult.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Provide at least one setting to update.',
          },
        },
        400,
      );
    }

    const validatedData = bodyResult.data;

    try {
      const now = new Date();
      const existing = await fetchSettings();
      const visibilityRecord = await fetchProductVisibilityRecord();
      const nextVisibility = mergeVisibilityPatch(visibilityRecord, {
        subscriptionsEnabled: validatedData.subscriptionsEnabled,
        masterclassesEnabled: validatedData.masterclassesEnabled,
        digitalProductsEnabled: validatedData.digitalProductsEnabled,
      });

      const nextInviteOnly = validatedData.inviteOnly ?? existing?.inviteOnlySignup ?? false;
      const nextEventMode = validatedData.eventMode ?? existing?.eventMode ?? false;
      const nextLibraryStoreEnabled =
        validatedData.libraryStoreEnabled ?? existing?.libraryStoreEnabled ?? false;

      const values = {
        inviteOnlySignup: nextInviteOnly,
        eventMode: nextEventMode,
        subscriptionsEnabled: nextVisibility.subscriptionsEnabled,
        masterclassesEnabled: nextVisibility.masterclassesEnabled,
        digitalProductsEnabled: nextVisibility.digitalProductsEnabled,
        libraryStoreEnabled: nextLibraryStoreEnabled,
        masterclassesLaunched: nextVisibility.masterclassesLaunched,
        digitalProductsLaunched: nextVisibility.digitalProductsLaunched,
        updatedAt: now,
        updatedBy: result.userId,
      };

      let updated: SettingsRecord | null = null;

      if (existing) {
        const [row] = await db
          .update(platformSettings)
          .set(values)
          .where(eq(platformSettings.id, existing.id))
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            eventMode: platformSettings.eventMode,
            masterclassesEnabled: platformSettings.masterclassesEnabled,
            digitalProductsEnabled: platformSettings.digitalProductsEnabled,
            libraryStoreEnabled: platformSettings.libraryStoreEnabled,
            subscriptionsEnabled: platformSettings.subscriptionsEnabled,
            masterclassesLaunched: platformSettings.masterclassesLaunched,
            digitalProductsLaunched: platformSettings.digitalProductsLaunched,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      } else {
        const [row] = await db
          .insert(platformSettings)
          .values({
            ...PRODUCT_VISIBILITY_DEFAULTS,
            ...values,
          })
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            eventMode: platformSettings.eventMode,
            masterclassesEnabled: platformSettings.masterclassesEnabled,
            digitalProductsEnabled: platformSettings.digitalProductsEnabled,
            libraryStoreEnabled: platformSettings.libraryStoreEnabled,
            subscriptionsEnabled: platformSettings.subscriptionsEnabled,
            masterclassesLaunched: platformSettings.masterclassesLaunched,
            digitalProductsLaunched: platformSettings.digitalProductsLaunched,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      }

      return c.json(toAdminPayload(updated));
    } catch (error) {
      if (error instanceof ApiError) {
        return respondError(c, error);
      }
      console.error('[settings] admin update failed', error);
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Unable to update settings right now.' } },
        500,
      );
    }
  });
}
