import { API_BASE, fetchJson } from './client';

export type CertificateFieldSettings = {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
};

export type CertificateDesignSettings = {
  studentName: CertificateFieldSettings;
  courseTitle: CertificateFieldSettings;
  issueDate: CertificateFieldSettings;
  certificateCode: CertificateFieldSettings;
};

export type GlobalCertificateSettings = {
  id: string | null;
  backgroundImageUrl: string | null;
  settings: CertificateDesignSettings;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MasterclassCertificateSettings = {
  id: string | null;
  masterclassId: string;
  certificateEnabled: boolean;
  certificateTitle: string | null;
  certificateDescription: string | null;
  certificateTemplateUrl: string | null;
};

export type CertificateRecord = {
  id: string;
  certificateCode: string;
  issueDate: string;
  status: 'issued' | 'revoked';
  generatedCertificateUrl: string | null;
  externalCertificateUrl: string | null;
  issuedManually: boolean;
};

export type PublicCertificateView = {
  certificateCode: string;
  studentName: string;
  masterclassTitle: string;
  certificateTitle: string | null;
  certificateDescription: string | null;
  issueDate: string;
  status: 'issued' | 'revoked';
  hasGeneratedPdf: boolean;
  externalCertificateUrl: string | null;
};

export type LearnerCertificateStatus = {
  certificateEnabled: boolean;
  isLocked: boolean;
  isComplete: boolean;
  totalLessons: number;
  completedLessons: number;
  certificate: CertificateRecord | null;
  certificateTitle: string | null;
  certificateDescription: string | null;
};

export type MasterclassCertificateAdminRow = {
  userId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  enrolledAt: string;
  source: 'paid' | 'manual';
  totalLessons: number;
  completedLessons: number;
  isComplete: boolean;
  certificate: CertificateRecord | null;
};

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

export async function fetchGlobalCertificateSettings(): Promise<GlobalCertificateSettings> {
  const data = await fetchJson<{ data: GlobalCertificateSettings }>(
    `${API_BASE}/certificate-settings`,
  );
  return data.data;
}

export async function updateGlobalCertificateSettings(payload: {
  backgroundImageUrl?: string | null;
  settings: CertificateDesignSettings;
}): Promise<GlobalCertificateSettings> {
  const data = await fetchJson<{ data: GlobalCertificateSettings }>(
    `${API_BASE}/certificate-settings`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function fetchMasterclassCertificateSettings(
  masterclassId: string,
): Promise<MasterclassCertificateSettings> {
  const data = await fetchJson<{ data: MasterclassCertificateSettings }>(
    `${API_BASE}/masterclasses/${masterclassId}/certificate-settings`,
  );
  return data.data;
}

export async function updateMasterclassCertificateSettings(
  masterclassId: string,
  payload: {
    certificateEnabled: boolean;
    certificateTitle?: string | null;
    certificateDescription?: string | null;
    certificateTemplateUrl?: string | null;
  },
): Promise<MasterclassCertificateSettings> {
  const data = await fetchJson<{ data: MasterclassCertificateSettings }>(
    `${API_BASE}/masterclasses/${masterclassId}/certificate-settings`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function fetchMasterclassCertificatesAdmin(masterclassId: string): Promise<{
  items: MasterclassCertificateAdminRow[];
  certificateSettings: MasterclassCertificateSettings;
}> {
  const data = await fetchJson<{
    data: {
      items: MasterclassCertificateAdminRow[];
      certificateSettings: MasterclassCertificateSettings;
    };
  }>(`${API_BASE}/masterclasses/${masterclassId}/certificates`);
  return data.data;
}

export async function manualIssueCertificate(
  masterclassId: string,
  payload: { userId: string; externalCertificateUrl?: string | null },
): Promise<unknown> {
  const data = await fetchJson<{ data: unknown }>(
    `${API_BASE}/masterclasses/${masterclassId}/certificates/manual`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return data.data;
}

export async function fetchLearnerCertificateStatus(
  masterclassId: string,
): Promise<LearnerCertificateStatus> {
  const data = await fetchJson<{ data: LearnerCertificateStatus }>(
    `${API_BASE}/masterclasses/learn/${masterclassId}/certificate`,
  );
  return data.data;
}

export function certificateDownloadUrl(certificateId: string): string {
  return `${API_BASE}/certificates/${certificateId}/download`;
}

function encodeCertificateCode(code: string): string {
  return encodeURIComponent(code.trim().toUpperCase());
}

export function certificatePublicShareUrl(certificateCode: string): string {
  const code = encodeCertificateCode(certificateCode);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/certificates/${code}`;
  }
  return `/certificates/${code}`;
}

export function certificatePublicDownloadUrl(certificateCode: string): string {
  return `${API_BASE}/certificates/public/${encodeCertificateCode(certificateCode)}/download`;
}

export function certificatePublicViewUrl(certificateCode: string): string {
  return `${API_BASE}/certificates/public/${encodeCertificateCode(certificateCode)}/view`;
}

export async function fetchPublicCertificate(certificateCode: string): Promise<PublicCertificateView> {
  const data = await fetchJson<{ data: PublicCertificateView }>(
    `${API_BASE}/certificates/public/${encodeCertificateCode(certificateCode)}`,
  );
  return data.data;
}
