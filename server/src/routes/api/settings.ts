import { eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { platformSettings } from '../../db/schema/index.js';
import { requireAdmin } from './utils.js';

type SettingsRecord = {
  id: string;
  inviteOnlySignup: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
};

async function fetchSettings(): Promise<SettingsRecord | null> {
  const [record] = await db
    .select({
      id: platformSettings.id,
      inviteOnlySignup: platformSettings.inviteOnlySignup,
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
        updatedAt: record?.updatedAt ?? null,
        updatedBy: record?.updatedBy ?? null,
      });
    } catch (error) {
      console.error('[settings] admin fetch failed', error);
      return c.json(
        {
          inviteOnly: false,
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

    const bodyResult = await c.req
      .json()
      .then((payload) =>
        z
          .object({
            inviteOnly: z.boolean(),
          })
          .safeParse(payload),
      )
      .catch(() => ({ success: false }) as z.SafeParseReturnType<unknown, unknown>);

    if (!bodyResult.success) {
      return c.json(
        { error: { code: 'INVALID_REQUEST', message: 'inviteOnly must be provided.' } },
        400,
      );
    }

    try {
      const now = new Date();
      const existing = await fetchSettings();

      let updated: SettingsRecord | null = null;

      if (existing) {
        const [row] = await db
          .update(platformSettings)
          .set({
            inviteOnlySignup: bodyResult.data.inviteOnly,
            updatedAt: now,
            updatedBy: result.userId,
          })
          .where(eq(platformSettings.id, existing.id))
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      } else {
        const [row] = await db
          .insert(platformSettings)
          .values({
            inviteOnlySignup: bodyResult.data.inviteOnly,
            updatedAt: now,
            updatedBy: result.userId,
          })
          .returning({
            id: platformSettings.id,
            inviteOnlySignup: platformSettings.inviteOnlySignup,
            updatedAt: platformSettings.updatedAt,
            updatedBy: platformSettings.updatedBy,
          });
        updated = row ?? null;
      }

      return c.json({
        inviteOnly: updated?.inviteOnlySignup ?? bodyResult.data.inviteOnly,
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
