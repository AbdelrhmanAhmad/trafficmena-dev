import type { CSSProperties } from 'react';
import type { CertificateFieldSettings } from '@/app/api/certificates';

/** Width at which admin preview font sizes (px) look correct. */
export const CERTIFICATE_PREVIEW_REFERENCE_WIDTH = 768;

export function getCertificatePreviewScale(containerWidth: number): number {
  if (!containerWidth || containerWidth <= 0) return 1;
  return containerWidth / CERTIFICATE_PREVIEW_REFERENCE_WIDTH;
}

export function getCertificateFieldTransform(align: CertificateFieldSettings['align']): string {
  if (align === 'center') return 'translate(-50%, -50%)';
  if (align === 'right') return 'translate(-100%, -50%)';
  return 'translate(0, -50%)';
}

export function buildCertificateFieldStyle(
  field: CertificateFieldSettings,
  options?: {
    scale?: number;
    allowWrap?: boolean;
  },
): CSSProperties {
  const scale = options?.scale ?? 1;
  const allowWrap = options?.allowWrap ?? false;

  return {
    position: 'absolute',
    left: `${field.x}%`,
    top: `${field.y}%`,
    transform: getCertificateFieldTransform(field.align),
    fontSize: `${field.fontSize * scale}px`,
    color: field.color,
    fontWeight: field.fontWeight === 'bold' ? 700 : 400,
    whiteSpace: allowWrap ? 'normal' : 'nowrap',
    textAlign: field.align,
    lineHeight: allowWrap ? 1.25 : 1,
    maxWidth: allowWrap ? (field.align === 'center' ? '88%' : '42%') : '90%',
    overflow: allowWrap ? 'visible' : 'hidden',
    textOverflow: allowWrap ? 'clip' : 'ellipsis',
  };
}
