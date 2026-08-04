import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { platformSettings } from '../../db/schema/index.js';
import { requireAdmin } from './utils.js';

type SettingsRecord = {
  id: string;
  inviteOnlySignup: boolean;
  eventMode: boolean;
  masterclassesEnabled: boolean;
  digitalProductsEnabled: boolean;
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

function toAdminPayload(record: SettingsRecord | null, fallbacks?: Partial<SettingsRecord>) {
  return {
    inviteOnly: record?.inviteOnlySignup ?? fallbacks?.inviteOnlySignup ?? false,
    eventMode: record?.eventMode ?? fallbacks?.eventMode ?? false,
    masterclassesEnabled: record?.masterclassesEnabled ?? fallbacks?.masterclassesEnabled ?? true,
    digitalProductsEnabled:
      record?.digitalProductsEnabled ?? fallbacks?.digitalProductsEnabled ?? true,
    updatedAt: record?.updatedAt ?? null,
    updatedBy: record?.updatedBy ?? null,
  };
}

export function registerSettingsRoutes(app: Hono) {
  app.get('/settings/public', async (c) => {
    try {
      const record = await fetchSettings();
      c.header('Cache-Control', 'no-store');
      return c.json({
        inviteOnly: record?.inviteOnlySignup ?? false,
        masterclassesEnabled: record?.masterclassesEnabled ?? true,
        digitalProductsEnabled: record?.digitalProductsEnabled ?? true,
      });
    } catch (error) {
      console.error('[settings] public fetch failed', error);
      c.header('Cache-Control', 'no-store');
      return c.json({
        inviteOnly: false,
        masterclassesEnabled: true,
        digitalProductsEnabled: true,
      });
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
        masterclassesEnabled: z.boolean().optional(),
        digitalProductsEnabled: z.boolean().optional(),
      })
      .refine(
        (data) =>
          data.inviteOnly !== undefined ||
          data.eventMode !== undefined ||
          data.masterclassesEnabled !== undefined ||
          data.digitalProductsEnabled !== undefined,
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
      const nextInviteOnly = validatedData.inviteOnly ?? existing?.inviteOnlySignup ?? false;
      const nextEventMode = validatedData.eventMode ?? existing?.eventMode ?? false;
      const nextMasterclassesEnabled =
        validatedData.masterclassesEnabled ?? existing?.masterclassesEnabled ?? true;
      const nextDigitalProductsEnabled =
        validatedData.digitalProductsEnabled ?? existing?.digitalProductsEnabled ?? true;

      const values = {
        inviteOnlySignup: nextInviteOnly,
        eventMode: nextEventMode,
        masterclassesEnabled: nextMasterclassesEnabled,
        digitalProductsEnabled: nextDigitalProductsEnabled,
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
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      } else {
        const [row] = await db
          .insert(platformSettings)
          .values(values)
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            eventMode: platformSettings.eventMode,
            masterclassesEnabled: platformSettings.masterclassesEnabled,
            digitalProductsEnabled: platformSettings.digitalProductsEnabled,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      }

      return c.json(
        toAdminPayload(updated, {
          inviteOnlySignup: nextInviteOnly,
          eventMode: nextEventMode,
          masterclassesEnabled: nextMasterclassesEnabled,
          digitalProductsEnabled: nextDigitalProductsEnabled,
        }),
      );
    } catch (error) {
      console.error('[settings] admin update failed', error);
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Unable to update settings right now.' } },
        500,
      );
    }
  });
}
