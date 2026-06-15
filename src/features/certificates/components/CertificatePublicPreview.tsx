import { useEffect, useRef, useState } from 'react';
import type { CertificateDesignSettings } from '@/app/api/certificates';
import {
  buildCertificateFieldStyle,
  CERTIFICATE_PREVIEW_REFERENCE_WIDTH,
  getCertificatePreviewScale,
} from '@/features/certificates/utils/certificatePreviewUtils';

type CertificatePublicPreviewProps = {
  backgroundImageUrl: string;
  settings: CertificateDesignSettings;
  studentName: string;
  courseTitle: string;
  issueDate: string;
  certificateCode: string;
};

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(CERTIFICATE_PREVIEW_REFERENCE_WIDTH);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function CertificatePublicPreview({
  backgroundImageUrl,
  settings,
  studentName,
  courseTitle,
  issueDate,
  certificateCode,
}: CertificatePublicPreviewProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const scale = getCertificatePreviewScale(width);

  const fieldOptions = { scale, allowWrap: true as const };

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[1.414/1] w-full max-w-3xl overflow-hidden rounded-xl border bg-neutral-100 shadow-md"
    >
      <img
        src={backgroundImageUrl}
        alt="Certificate"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span style={buildCertificateFieldStyle(settings.studentName, fieldOptions)}>
          {studentName}
        </span>
        <span style={buildCertificateFieldStyle(settings.courseTitle, fieldOptions)}>
          {courseTitle}
        </span>
        <span style={buildCertificateFieldStyle(settings.issueDate, fieldOptions)}>
          {issueDate}
        </span>
        <span style={buildCertificateFieldStyle(settings.certificateCode, fieldOptions)}>
          {certificateCode}
        </span>
      </div>
    </div>
  );
}
