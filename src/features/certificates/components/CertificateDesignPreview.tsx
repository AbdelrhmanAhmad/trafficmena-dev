import type { CertificateDesignSettings, CertificateFieldSettings } from '@/app/api/certificates';
import { buildCertificateFieldStyle } from '@/features/certificates/utils/certificatePreviewUtils';

type CertificateDesignPreviewProps = {
  backgroundImageUrl: string | null;
  settings: CertificateDesignSettings;
  sample?: {
    studentName?: string;
    courseTitle?: string;
    issueDate?: string;
    certificateCode?: string;
  };
};

function fieldStyle(field: CertificateFieldSettings) {
  return buildCertificateFieldStyle(field, { scale: 1, allowWrap: false });
}

export function CertificateDesignPreview({
  backgroundImageUrl,
  settings,
  sample = {},
}: CertificateDesignPreviewProps) {
  const studentName = sample.studentName ?? 'John Doe';
  const courseTitle = sample.courseTitle ?? 'AI Marketing Masterclass';
  const issueDate = sample.issueDate ?? '15 June 2026';
  const certificateCode = sample.certificateCode ?? 'CERT-2026-PREVIEW';

  return (
    <div className="relative mx-auto aspect-[1.414/1] w-full max-w-3xl overflow-hidden rounded-xl border bg-neutral-100 shadow-inner">
      {backgroundImageUrl ? (
        <img
          src={backgroundImageUrl}
          alt="Certificate background"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Upload a background image to preview
        </div>
      )}
      <div className="pointer-events-none absolute inset-0">
        <span style={fieldStyle(settings.studentName)}>{studentName}</span>
        <span style={fieldStyle(settings.courseTitle)}>{courseTitle}</span>
        <span style={fieldStyle(settings.issueDate)}>{issueDate}</span>
        <span style={fieldStyle(settings.certificateCode)}>{certificateCode}</span>
      </div>
    </div>
  );
}
