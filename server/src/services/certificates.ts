import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { db } from '../db/client.js';
import {
  certificateSettings,
  certificates,
  masterclassCertificateSettings,
  masterclassEnrollments,
  masterclassLessonProgress,
  masterclassLessons,
  masterclassModules,
  masterclasses,
  payments,
  profiles,
  users,
  type CertificateDesignSettings,
  type CertificateFieldSettings,
} from '../db/schema/index.js';
import { ApiError } from '../utils/errors.js';
import { countCompletedLessons, countMasterclassLessons } from './masterclassSales.js';
import { fetchRemoteFileBytes, uploadCertificatePdfBuffer, deleteRemoteFileByUrl } from './certificateStorage.js';
import { isKnownDatabaseConflict } from '../routes/api/utils.js';

export const DEFAULT_CERTIFICATE_DESIGN: CertificateDesignSettings = {
  studentName: {
    x: 50,
    y: 45,
    fontSize: 42,
    color: '#111827',
    align: 'center',
    fontWeight: 'bold',
  },
  courseTitle: {
    x: 50,
    y: 58,
    fontSize: 26,
    color: '#374151',
    align: 'center',
    fontWeight: 'normal',
  },
  issueDate: {
    x: 35,
    y: 72,
    fontSize: 16,
    color: '#374151',
    align: 'center',
    fontWeight: 'normal',
  },
  certificateCode: {
    x: 70,
    y: 72,
    fontSize: 16,
    color: '#374151',
    align: 'center',
    fontWeight: 'normal',
  },
};

function mergeDesignSettings(
  partial: Partial<CertificateDesignSettings> | null | undefined,
): CertificateDesignSettings {
  if (!partial) return { ...DEFAULT_CERTIFICATE_DESIGN };
  return {
    studentName: { ...DEFAULT_CERTIFICATE_DESIGN.studentName, ...partial.studentName },
    courseTitle: { ...DEFAULT_CERTIFICATE_DESIGN.courseTitle, ...partial.courseTitle },
    issueDate: { ...DEFAULT_CERTIFICATE_DESIGN.issueDate, ...partial.issueDate },
    certificateCode: {
      ...DEFAULT_CERTIFICATE_DESIGN.certificateCode,
      ...partial.certificateCode,
    },
  };
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    return rgb(0.07, 0.09, 0.15);
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function formatIssueDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  return `CERT-${year}-${suffix}`;
}

async function resolveStudentName(userId: string): Promise<string> {
  const [row] = await db
    .select({
      name: users.name,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return 'Student';
  const fromProfile = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return fromProfile || row.name || 'Student';
}

function sanitizeTextForPdf(text: string, fallback: string): string {
  const sanitized = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized || fallback;
}

function drawAlignedText(
  page: PDFPage,
  text: string,
  field: CertificateFieldSettings,
  font: PDFFont,
  pageWidth: number,
  pageHeight: number,
) {
  const xBase = (pageWidth * field.x) / 100;
  const yFromTop = (pageHeight * field.y) / 100;
  const pdfY = pageHeight - yFromTop;
  const textWidth = font.widthOfTextAtSize(text, field.fontSize);
  let x = xBase;
  if (field.align === 'center') {
    x = xBase - textWidth / 2;
  } else if (field.align === 'right') {
    x = xBase - textWidth;
  }
  const y = pdfY - field.fontSize / 3;
  page.drawText(text, {
    x,
    y,
    size: field.fontSize,
    font,
    color: parseHexColor(field.color),
  });
}

export async function generateCertificatePdf(params: {
  backgroundImageUrl: string;
  design: CertificateDesignSettings;
  studentName: string;
  courseTitle: string;
  issueDate: Date;
  certificateCode: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const imageBytes = await fetchRemoteFileBytes(params.backgroundImageUrl);
  const isPng =
    params.backgroundImageUrl.toLowerCase().includes('.png') ||
    imageBytes[0] === 0x89;
  const embeddedImage = isPng
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
  const { width, height } = page.getSize();
  page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pickFont = (field: CertificateFieldSettings) =>
    field.fontWeight === 'bold' ? fontBold : fontNormal;

  drawAlignedText(
    page,
    sanitizeTextForPdf(params.studentName, 'Certificate Recipient'),
    params.design.studentName,
    pickFont(params.design.studentName),
    width,
    height,
  );
  drawAlignedText(
    page,
    sanitizeTextForPdf(params.courseTitle, 'Masterclass Certificate'),
    params.design.courseTitle,
    pickFont(params.design.courseTitle),
    width,
    height,
  );
  drawAlignedText(
    page,
    formatIssueDate(params.issueDate),
    params.design.issueDate,
    pickFont(params.design.issueDate),
    width,
    height,
  );
  drawAlignedText(
    page,
    params.certificateCode,
    params.design.certificateCode,
    pickFont(params.design.certificateCode),
    width,
    height,
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export async function getGlobalCertificateSettings() {
  const [row] = await db.select().from(certificateSettings).limit(1);
  if (!row) {
    return {
      id: null as string | null,
      backgroundImageUrl: null as string | null,
      settings: { ...DEFAULT_CERTIFICATE_DESIGN },
      createdAt: null as Date | null,
      updatedAt: null as Date | null,
    };
  }
  return {
    id: row.id,
    backgroundImageUrl: row.backgroundImageUrl,
    settings: mergeDesignSettings(row.settings as Partial<CertificateDesignSettings>),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function upsertGlobalCertificateSettings(payload: {
  backgroundImageUrl?: string | null;
  settings: CertificateDesignSettings;
}) {
  const existing = await getGlobalCertificateSettings();
  if (existing.id) {
    const [updated] = await db
      .update(certificateSettings)
      .set({
        backgroundImageUrl: payload.backgroundImageUrl ?? existing.backgroundImageUrl,
        settings: payload.settings,
        updatedAt: new Date(),
      })
      .where(eq(certificateSettings.id, existing.id))
      .returning();
    return {
      ...updated,
      settings: mergeDesignSettings(updated.settings as Partial<CertificateDesignSettings>),
    };
  }

  const [created] = await db
    .insert(certificateSettings)
    .values({
      backgroundImageUrl: payload.backgroundImageUrl ?? null,
      settings: payload.settings,
    })
    .returning();
  return {
    ...created,
    settings: mergeDesignSettings(created.settings as Partial<CertificateDesignSettings>),
  };
}

export async function getMasterclassCertificateSettings(masterclassId: string) {
  const [row] = await db
    .select()
    .from(masterclassCertificateSettings)
    .where(eq(masterclassCertificateSettings.masterclassId, masterclassId))
    .limit(1);

  if (!row) {
    return {
      id: null as string | null,
      masterclassId,
      certificateEnabled: false,
      certificateTitle: null as string | null,
      certificateDescription: null as string | null,
      certificateTemplateUrl: null as string | null,
    };
  }
  return row;
}

export async function upsertMasterclassCertificateSettings(
  masterclassId: string,
  payload: {
    certificateEnabled: boolean;
    certificateTitle?: string | null;
    certificateDescription?: string | null;
    certificateTemplateUrl?: string | null;
  },
) {
  const existing = await getMasterclassCertificateSettings(masterclassId);
  if (existing.id) {
    const [updated] = await db
      .update(masterclassCertificateSettings)
      .set({
        certificateEnabled: payload.certificateEnabled,
        certificateTitle: payload.certificateTitle ?? null,
        certificateDescription: payload.certificateDescription ?? null,
        certificateTemplateUrl: payload.certificateTemplateUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(masterclassCertificateSettings.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(masterclassCertificateSettings)
    .values({
      masterclassId,
      certificateEnabled: payload.certificateEnabled,
      certificateTitle: payload.certificateTitle ?? null,
      certificateDescription: payload.certificateDescription ?? null,
      certificateTemplateUrl: payload.certificateTemplateUrl ?? null,
    })
    .returning();
  return created;
}

export async function getUserMasterclassCertificate(userId: string, masterclassId: string) {
  const [row] = await db
    .select()
    .from(certificates)
    .where(
      and(eq(certificates.userId, userId), eq(certificates.masterclassId, masterclassId)),
    )
    .limit(1);
  return row ?? null;
}

export async function isUserEnrolledInMasterclass(
  userId: string,
  masterclassId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: masterclassEnrollments.id })
    .from(masterclassEnrollments)
    .where(
      and(
        eq(masterclassEnrollments.userId, userId),
        eq(masterclassEnrollments.masterclassId, masterclassId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function isMasterclassFullyCompleted(
  userId: string,
  masterclassId: string,
): Promise<boolean> {
  const total = await countMasterclassLessons(masterclassId);
  if (total === 0) return false;
  const completed = await countCompletedLessons(userId, masterclassId);
  return completed >= total;
}

export async function shouldIssueCertificate(
  userId: string,
  masterclassId: string,
  options: { requireCompletion?: boolean } = {},
): Promise<{ ok: boolean; reason?: string }> {
  const requireCompletion = options.requireCompletion ?? true;

  const existing = await getUserMasterclassCertificate(userId, masterclassId);
  if (existing) {
    return { ok: false, reason: 'ALREADY_ISSUED' };
  }

  const enrolled = await isUserEnrolledInMasterclass(userId, masterclassId);
  if (!enrolled) {
    return { ok: false, reason: 'NOT_ENROLLED' };
  }

  const classSettings = await getMasterclassCertificateSettings(masterclassId);
  if (!classSettings.certificateEnabled) {
    return { ok: false, reason: 'CERTIFICATE_DISABLED' };
  }

  const globalSettings = await getGlobalCertificateSettings();
  if (!globalSettings.backgroundImageUrl) {
    return { ok: false, reason: 'NO_BACKGROUND' };
  }

  if (requireCompletion) {
    const complete = await isMasterclassFullyCompleted(userId, masterclassId);
    if (!complete) {
      return { ok: false, reason: 'NOT_COMPLETED' };
    }
  }

  return { ok: true };
}

async function createCertificateRecord(params: {
  userId: string;
  masterclassId: string;
  issuedManually: boolean;
  issuedByAdminId?: string | null;
  externalCertificateUrl?: string | null;
  certificateTemplateUrl?: string | null;
}) {
  const globalSettings = await getGlobalCertificateSettings();
  if (!globalSettings.backgroundImageUrl) {
    throw new ApiError(
      'NO_CERTIFICATE_BACKGROUND',
      'Global certificate background image is not configured.',
      409,
    );
  }

  const [masterclass] = await db
    .select({ title: masterclasses.title })
    .from(masterclasses)
    .where(eq(masterclasses.id, params.masterclassId))
    .limit(1);
  if (!masterclass) {
    throw new ApiError('MASTERCLASS_NOT_FOUND', 'Masterclass not found.', 404);
  }

  const classSettings = await getMasterclassCertificateSettings(params.masterclassId);
  const courseTitle =
    classSettings.certificateTitle?.trim() || masterclass.title;
  const studentName = await resolveStudentName(params.userId);
  const issueDate = new Date();
  const certificateCode = generateCertificateCode();

  const pdfBuffer = await generateCertificatePdf({
    backgroundImageUrl: globalSettings.backgroundImageUrl,
    design: globalSettings.settings,
    studentName,
    courseTitle,
    issueDate,
    certificateCode,
  });

  const generatedUrl = await uploadCertificatePdfBuffer(pdfBuffer, certificateCode);

  try {
    const [created] = await db
      .insert(certificates)
      .values({
        userId: params.userId,
        masterclassId: params.masterclassId,
        certificateCode,
        issueDate,
        status: 'issued',
        generatedCertificateUrl: generatedUrl,
        externalCertificateUrl: params.externalCertificateUrl ?? null,
        certificateTemplateUrl:
          params.certificateTemplateUrl ?? classSettings.certificateTemplateUrl ?? null,
        issuedByAdminId: params.issuedByAdminId ?? null,
        issuedManually: params.issuedManually,
      })
      .returning();
    return created;
  } catch (error) {
    if (isKnownDatabaseConflict(error) === 'unique') {
      const existing = await getUserMasterclassCertificate(params.userId, params.masterclassId);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function issueCertificateForCompletion(userId: string, masterclassId: string) {
  const check = await shouldIssueCertificate(userId, masterclassId, { requireCompletion: true });
  if (!check.ok) {
    if (check.reason === 'ALREADY_ISSUED') {
      return getUserMasterclassCertificate(userId, masterclassId);
    }
    return null;
  }
  return createCertificateRecord({
    userId,
    masterclassId,
    issuedManually: false,
  });
}

export async function issueCertificateManually(params: {
  userId: string;
  masterclassId: string;
  issuedByAdminId: string;
  externalCertificateUrl?: string | null;
}) {
  const enrolled = await isUserEnrolledInMasterclass(params.userId, params.masterclassId);
  if (!enrolled) {
    throw new ApiError('NOT_ENROLLED', 'User must be enrolled in this masterclass.', 400);
  }

  const existing = await getUserMasterclassCertificate(params.userId, params.masterclassId);
  if (existing) return existing;

  const classSettings = await getMasterclassCertificateSettings(params.masterclassId);
  if (!classSettings.certificateEnabled) {
    throw new ApiError(
      'CERTIFICATE_DISABLED',
      'Certificate is not enabled for this masterclass.',
      409,
    );
  }

  return createCertificateRecord({
    userId: params.userId,
    masterclassId: params.masterclassId,
    issuedManually: true,
    issuedByAdminId: params.issuedByAdminId,
    externalCertificateUrl: params.externalCertificateUrl ?? null,
  });
}

export async function tryIssueCertificateOnCompletion(userId: string, masterclassId: string) {
  try {
    return await issueCertificateForCompletion(userId, masterclassId);
  } catch (error) {
    console.error('[certificates] Auto-issue on completion failed', {
      userId,
      masterclassId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getLearnerCertificateStatus(userId: string, masterclassId: string) {
  const classSettings = await getMasterclassCertificateSettings(masterclassId);
  const totalLessons = await countMasterclassLessons(masterclassId);
  const completedLessons = await countCompletedLessons(userId, masterclassId);
  const certificate = await getUserMasterclassCertificate(userId, masterclassId);

  const certificateEnabled = classSettings.certificateEnabled;
  const isComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const isLocked = certificateEnabled && !certificate && !isComplete;

  return {
    certificateEnabled,
    isLocked,
    isComplete,
    totalLessons,
    completedLessons,
    certificate: certificate
      ? {
          id: certificate.id,
          certificateCode: certificate.certificateCode,
          issueDate: certificate.issueDate,
          status: certificate.status,
          generatedCertificateUrl: certificate.generatedCertificateUrl,
          externalCertificateUrl: certificate.externalCertificateUrl,
          issuedManually: certificate.issuedManually,
        }
      : null,
    certificateTitle: classSettings.certificateTitle,
    certificateDescription: classSettings.certificateDescription,
  };
}

export async function listMasterclassCertificateAdminRows(masterclassId: string) {
  const enrollments = await db
    .select({
      userId: masterclassEnrollments.userId,
      email: users.email,
      name: users.name,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      phoneNumber: profiles.phoneNumber,
      enrolledAt: masterclassEnrollments.enrolledAt,
      source: masterclassEnrollments.source,
      purchasedPriceInCents: payments.amountCents,
    })
    .from(masterclassEnrollments)
    .innerJoin(users, eq(users.id, masterclassEnrollments.userId))
    .leftJoin(profiles, eq(profiles.id, users.id))
    .leftJoin(payments, eq(payments.id, masterclassEnrollments.paymentId))
    .where(eq(masterclassEnrollments.masterclassId, masterclassId))
    .orderBy(sql`${masterclassEnrollments.enrolledAt} desc`);

  const totalLessons = await countMasterclassLessons(masterclassId);

  const rows = await Promise.all(
    enrollments.map(async (enrollment) => {
      const completedLessons = await countCompletedLessons(
        enrollment.userId,
        masterclassId,
      );
      const certificate = await getUserMasterclassCertificate(
        enrollment.userId,
        masterclassId,
      );
      return {
        userId: enrollment.userId,
        email: enrollment.email,
        name: enrollment.name,
        firstName: enrollment.firstName,
        lastName: enrollment.lastName,
        phoneNumber: enrollment.phoneNumber,
        enrolledAt: enrollment.enrolledAt,
        source: enrollment.source,
        purchasedPriceInCents: enrollment.purchasedPriceInCents,
        totalLessons,
        completedLessons,
        isComplete: totalLessons > 0 && completedLessons >= totalLessons,
        certificate: certificate
          ? {
              id: certificate.id,
              certificateCode: certificate.certificateCode,
              issueDate: certificate.issueDate,
              status: certificate.status,
              generatedCertificateUrl: certificate.generatedCertificateUrl,
              externalCertificateUrl: certificate.externalCertificateUrl,
              issuedManually: certificate.issuedManually,
            }
          : null,
      };
    }),
  );

  return rows;
}

export function normalizeCertificateCode(rawCode: string): string {
  return rawCode.trim().toUpperCase();
}

export async function getCertificateByCode(certificateCode: string) {
  const code = normalizeCertificateCode(certificateCode);
  const [row] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.certificateCode, code))
    .limit(1);
  return row ?? null;
}

export async function getCertificateById(certificateId: string) {
  const [row] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1);
  return row ?? null;
}

export async function getPublicCertificateByCode(rawCode: string) {
  const code = normalizeCertificateCode(rawCode);
  const [row] = await db
    .select({
      certificate: certificates,
      masterclassTitle: masterclasses.title,
      certificateTitle: masterclassCertificateSettings.certificateTitle,
      certificateDescription: masterclassCertificateSettings.certificateDescription,
    })
    .from(certificates)
    .innerJoin(masterclasses, eq(certificates.masterclassId, masterclasses.id))
    .leftJoin(
      masterclassCertificateSettings,
      eq(masterclassCertificateSettings.masterclassId, certificates.masterclassId),
    )
    .where(eq(certificates.certificateCode, code))
    .limit(1);

  if (!row) return null;

  const studentName = await resolveStudentName(row.certificate.userId);
  const displayTitle = row.certificateTitle?.trim() || row.masterclassTitle;

  let preview: {
    backgroundImageUrl: string;
    settings: CertificateDesignSettings;
  } | null = null;

  if (row.certificate.status === 'issued') {
    const globalSettings = await getGlobalCertificateSettings();
    if (globalSettings.backgroundImageUrl) {
      preview = {
        backgroundImageUrl: globalSettings.backgroundImageUrl,
        settings: globalSettings.settings,
      };
    }
  }

  return {
    certificateCode: row.certificate.certificateCode,
    studentName,
    masterclassTitle: displayTitle,
    certificateTitle: row.certificateTitle,
    certificateDescription: row.certificateDescription,
    issueDate: row.certificate.issueDate,
    status: row.certificate.status,
    hasGeneratedPdf: Boolean(row.certificate.generatedCertificateUrl),
    externalCertificateUrl: row.certificate.externalCertificateUrl,
    preview,
  };
}

export async function deleteCertificateRecord(certificateId: string) {
  const certificate = await getCertificateById(certificateId);
  if (!certificate) {
    return null;
  }

  if (certificate.generatedCertificateUrl) {
    await deleteRemoteFileByUrl(certificate.generatedCertificateUrl);
  }

  const [deleted] = await db
    .delete(certificates)
    .where(eq(certificates.id, certificateId))
    .returning();

  return deleted ?? null;
}

export async function updateCertificateExternalUrl(
  certificateId: string,
  externalCertificateUrl: string | null,
) {
  const [updated] = await db
    .update(certificates)
    .set({ externalCertificateUrl, updatedAt: new Date() })
    .where(eq(certificates.id, certificateId))
    .returning();
  return updated ?? null;
}

export { mergeDesignSettings };
