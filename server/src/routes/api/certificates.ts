import type { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import {
  DEFAULT_CERTIFICATE_DESIGN,
  getCertificateByCode,
  getCertificateById,
  getGlobalCertificateSettings,
  getLearnerCertificateStatus,
  getMasterclassCertificateSettings,
  getPublicCertificateByCode,
  issueCertificateManually,
  listMasterclassCertificateAdminRows,
  mergeDesignSettings,
  normalizeCertificateCode,
  updateCertificateExternalUrl,
  upsertGlobalCertificateSettings,
  upsertMasterclassCertificateSettings,
} from '../../services/certificates.js';
import type { CertificateDesignSettings } from '../../db/schema/index.js';
import { fetchRemoteFileBytes } from '../../services/certificateStorage.js';
import { ApiError } from '../../utils/errors.js';
import { getSessionFromRequest } from '../../utils/session.js';
import { requireAdmin } from './utils.js';

const fieldSettingsSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  fontSize: z.number().min(8).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  align: z.enum(['left', 'center', 'right']),
  fontWeight: z.enum(['normal', 'bold']),
});

const designSettingsSchema = z.object({
  studentName: fieldSettingsSchema,
  courseTitle: fieldSettingsSchema,
  issueDate: fieldSettingsSchema,
  certificateCode: fieldSettingsSchema,
});

const globalSettingsSchema = z.object({
  backgroundImageUrl: z.string().url().nullable().optional(),
  settings: designSettingsSchema,
});

const masterclassCertSettingsSchema = z.object({
  certificateEnabled: z.boolean(),
  certificateTitle: z.string().max(200).nullable().optional(),
  certificateDescription: z.string().max(2000).nullable().optional(),
  certificateTemplateUrl: z.string().url().nullable().optional(),
});

const manualIssueSchema = z.object({
  userId: z.string().uuid(),
  externalCertificateUrl: z.string().url().nullable().optional(),
});

const externalUrlSchema = z.object({
  externalCertificateUrl: z.string().url().nullable(),
});

const uuidParamSchema = z.string().uuid();

const certificateCodeParamSchema = z
  .string()
  .regex(/^CERT-\d{4}-[A-F0-9]{6}$/i, 'Invalid certificate code format.');

async function streamCertificatePdf(
  certificate: NonNullable<Awaited<ReturnType<typeof getCertificateByCode>>>,
  disposition: 'attachment' | 'inline',
) {
  if (!certificate.generatedCertificateUrl) {
    throw new ApiError('NO_PDF', 'Generated certificate PDF is not available.', 404);
  }

  const bytes = await fetchRemoteFileBytes(certificate.generatedCertificateUrl);
  const filename = `${certificate.certificateCode}.pdf`;
  return {
    bytes,
    filename,
    disposition,
  };
}

async function assertCertificateAccess(
  certificateId: string,
  userId: string,
  isAdmin: boolean,
) {
  const certificate = await getCertificateById(certificateId);
  if (!certificate) {
    throw new ApiError('NOT_FOUND', 'Certificate not found.', 404);
  }
  if (!isAdmin && certificate.userId !== userId) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this certificate.', 403);
  }
  return certificate;
}

export function registerCertificateRoutes(app: Hono) {
  app.get('/certificates/public/:code', async (c) => {
    const codeParsed = certificateCodeParamSchema.safeParse(c.req.param('code'));
    if (!codeParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate code.' } }, 400);
    }

    const certificate = await getPublicCertificateByCode(codeParsed.data);
    if (!certificate) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found.' } }, 404);
    }

    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ data: certificate });
  });

  app.get('/certificates/public/:code/download', async (c) => {
    const codeParsed = certificateCodeParamSchema.safeParse(c.req.param('code'));
    if (!codeParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate code.' } }, 400);
    }

    try {
      const certificate = await getCertificateByCode(normalizeCertificateCode(codeParsed.data));
      if (!certificate) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found.' } }, 404);
      }
      if (certificate.status !== 'issued') {
        return c.json(
          { error: { code: 'REVOKED', message: 'This certificate is no longer valid.' } },
          410,
        );
      }

      const { bytes, filename } = await streamCertificatePdf(certificate, 'attachment');
      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      return c.body(Buffer.from(bytes));
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[certificates/public/download] failed', error);
      return c.json(
        { error: { code: 'DOWNLOAD_FAILED', message: 'Failed to download certificate.' } },
        500,
      );
    }
  });

  app.get('/certificates/public/:code/view', async (c) => {
    const codeParsed = certificateCodeParamSchema.safeParse(c.req.param('code'));
    if (!codeParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate code.' } }, 400);
    }

    try {
      const certificate = await getCertificateByCode(normalizeCertificateCode(codeParsed.data));
      if (!certificate) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found.' } }, 404);
      }
      if (certificate.status !== 'issued') {
        return c.json(
          { error: { code: 'REVOKED', message: 'This certificate is no longer valid.' } },
          410,
        );
      }

      const { bytes, filename } = await streamCertificatePdf(certificate, 'inline');
      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', `inline; filename="${filename}"`);
      return c.body(Buffer.from(bytes));
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[certificates/public/view] failed', error);
      return c.json(
        { error: { code: 'VIEW_FAILED', message: 'Failed to view certificate.' } },
        500,
      );
    }
  });

  app.get('/certificate-settings', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const settings = await getGlobalCertificateSettings();
    return c.json({ data: settings });
  });

  app.put('/certificate-settings', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const body = await c.req.json().catch(() => ({}));
    const parsed = globalSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const updated = await upsertGlobalCertificateSettings({
      backgroundImageUrl: parsed.data.backgroundImageUrl,
      settings: parsed.data.settings as CertificateDesignSettings,
    });
    return c.json({ data: updated });
  });

  app.get('/masterclasses/:id/certificate-settings', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const settings = await getMasterclassCertificateSettings(idParsed.data);
    return c.json({ data: settings });
  });

  app.put('/masterclasses/:id/certificate-settings', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = masterclassCertSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const updated = await upsertMasterclassCertificateSettings(idParsed.data, parsed.data);
    return c.json({ data: updated });
  });

  app.get('/masterclasses/:id/certificates', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const items = await listMasterclassCertificateAdminRows(idParsed.data);
    const classSettings = await getMasterclassCertificateSettings(idParsed.data);
    return c.json({ data: { items, certificateSettings: classSettings } });
  });

  app.post('/masterclasses/:id/certificates/manual', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid masterclass id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = manualIssueSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    try {
      const certificate = await issueCertificateManually({
        userId: parsed.data.userId,
        masterclassId: idParsed.data,
        issuedByAdminId: staff.userId,
        externalCertificateUrl: parsed.data.externalCertificateUrl ?? null,
      });
      return c.json({ data: certificate }, 201);
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[certificates/manual] failed', error);
      return c.json(
        { error: { code: 'ISSUE_FAILED', message: 'Failed to issue certificate.' } },
        500,
      );
    }
  });

  app.get('/certificates/:id', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate id.' } }, 400);
    }

    const admin = await requireAdmin(c);
    const isAdmin = !('response' in admin);

    try {
      const certificate = await assertCertificateAccess(
        idParsed.data,
        session.user.id,
        isAdmin,
      );
      return c.json({ data: certificate });
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      throw error;
    }
  });

  app.get('/certificates/:id/download', async (c) => {
    const session = await getSessionFromRequest(c);
    if (!session?.user?.id) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate id.' } }, 400);
    }

    const admin = await requireAdmin(c);
    const isAdmin = !('response' in admin);

    try {
      const certificate = await assertCertificateAccess(
        idParsed.data,
        session.user.id,
        isAdmin,
      );

      if (!certificate.generatedCertificateUrl) {
        return c.json(
          { error: { code: 'NO_PDF', message: 'Generated certificate PDF is not available.' } },
          404,
        );
      }

      const bytes = await fetchRemoteFileBytes(certificate.generatedCertificateUrl);
      const filename = `${certificate.certificateCode}.pdf`;
      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      return c.body(Buffer.from(bytes));
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: { code: error.code, message: error.message } },
          error.status as ContentfulStatusCode,
        );
      }
      console.error('[certificates/download] failed', error);
      return c.json(
        { error: { code: 'DOWNLOAD_FAILED', message: 'Failed to download certificate.' } },
        500,
      );
    }
  });

  app.put('/certificates/:id/external-url', async (c) => {
    const staff = await requireAdmin(c);
    if ('response' in staff) return staff.response;

    const idParsed = uuidParamSchema.safeParse(c.req.param('id'));
    if (!idParsed.success) {
      return c.json({ error: { code: 'INVALID_PARAM', message: 'Invalid certificate id.' } }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = externalUrlSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }

    const updated = await updateCertificateExternalUrl(
      idParsed.data,
      parsed.data.externalCertificateUrl,
    );
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found.' } }, 404);
    }
    return c.json({ data: updated });
  });
}

export { DEFAULT_CERTIFICATE_DESIGN, mergeDesignSettings };
