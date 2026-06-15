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
  updatedAt: Date | null;
  updatedBy: string | null;
};

async function fetchSettings(): Promise<SettingsRecord | null> {
  const [record] = await db
    .select({
      id: platformSettings.id,
      inviteOnlySignup: platformSettings.inviteOnlySignup,
      eventMode: platformSettings.eventMode,
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

export function registerSettingsRoutes(app: Hono) {
  app.get('/settings/public', async (c) => {
    try {
      const record = await fetchSettings();
      c.header('Cache-Control', 'public, max-age=30');
      return c.json({ inviteOnly: record?.inviteOnlySignup ?? false });
    } catch (error) {
      console.error('[settings] public fetch failed', error);
      c.header('Cache-Control', 'public, max-age=30');
      return c.json({ inviteOnly: false });
    }
  });

  app.get('/admin/settings/general', async (c) => {
    const result = await requireAdmin(c);
    if ('response' in result) {
      return result.response;
    }

    try {
      const record = await fetchSettings();
      return c.json({
        inviteOnly: record?.inviteOnlySignup ?? false,
        eventMode: record?.eventMode ?? false,
        updatedAt: record?.updatedAt ?? null,
        updatedBy: record?.updatedBy ?? null,
      });
    } catch (error) {
      console.error('[settings] admin fetch failed', error);
      return c.json(
        {
          inviteOnly: false,
          eventMode: false,
          updatedAt: null,
          updatedBy: null,
        },
        200,
      );
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
      })
      .refine(
        (data) => data.inviteOnly !== undefined || data.eventMode !== undefined,
        'At least one setting must be provided.',
      );

    const bodyResult = await c.req
      .json()
      .then((payload) => settingsSchema.safeParse(payload))
      .catch(() => ({ success: false as const, error: null }));

    if (!bodyResult.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'Provide inviteOnly or eventMode.' } },
        400,
      );
    }

    const validatedData = bodyResult.data;

    try {
      const now = new Date();
      const existing = await fetchSettings();
      const nextInviteOnly = validatedData.inviteOnly ?? existing?.inviteOnlySignup ?? false;
      const nextEventMode = validatedData.eventMode ?? existing?.eventMode ?? false;

      let updated: SettingsRecord | null = null;

      if (existing) {
        const [row] = await db
          .update(platformSettings)
          .set({
            inviteOnlySignup: nextInviteOnly,
            eventMode: nextEventMode,
            updatedAt: now,
            updatedBy: result.userId,
          })
          .where(eq(platformSettings.id, existing.id))
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            eventMode: platformSettings.eventMode,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      } else {
        const [row] = await db
          .insert(platformSettings)
          .values({
            inviteOnlySignup: nextInviteOnly,
            eventMode: nextEventMode,
            updatedAt: now,
            updatedBy: result.userId,
          })
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            eventMode: platformSettings.eventMode,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      }

      return c.json({
        inviteOnly: updated?.inviteOnlySignup ?? nextInviteOnly,
        eventMode: updated?.eventMode ?? nextEventMode,
        updatedAt: updated?.updatedAt ?? now,
        updatedBy: updated?.updatedBy ?? result.userId,
      });
    } catch (error) {
      console.error('[settings] admin update failed', error);
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Unable to update settings right now.' } },
        500,
      );
    }
  });
}
