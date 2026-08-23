import { Award, Download, ExternalLink, Lock } from 'lucide-react';
import {
  certificateDownloadUrl,
  certificatePublicShareUrl,
} from '@/app/api/certificates';
import { CertificateShareButton } from '@/features/certificates/components/CertificateShareButton';
import { useLearnerCertificateStatus } from '@/features/certificates/hooks/useCertificates';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

type MasterclassCertificateCardProps = {
  masterclassId: string;
};

export function MasterclassCertificateCard({ masterclassId }: MasterclassCertificateCardProps) {
  const { data, isLoading, isError } = useLearnerCertificateStatus(masterclassId);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data || !data.certificateEnabled) return null;

  const { certificate, isLocked, certificateTitle, certificateDescription } = data;

  return (
    <Card className="rounded-2xl border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-amber-600" />
          {certificateTitle || 'Certificate of completion'}
        </CardTitle>
        {certificateDescription && (
          <p className="text-sm text-neutral-600">{certificateDescription}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocked && !certificate && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-neutral-900">Certificate locked</p>
              <p className="text-sm text-neutral-600">
                Complete all lessons to unlock your certificate.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Progress: {data.completedLessons} / {data.totalLessons} lessons
              </p>
            </div>
          </div>
        )}

        {certificate && (
          <div className="space-y-3 rounded-lg border bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#29cf9f]">Issued</Badge>
              {certificate.issuedManually && <Badge variant="secondary">Manual</Badge>}
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Certificate code</dt>
                <dd className="font-mono font-medium">{certificate.certificateCode}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Issue date</dt>
                <dd className="font-medium">
                  {new Date(certificate.issueDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {certificate.generatedCertificateUrl && (
                <Button type="button" size="sm" asChild>
                  <a
                    href={certificateDownloadUrl(certificate.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              )}
              {certificate.externalCertificateUrl && (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={certificate.externalCertificateUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    External certificate
                  </a>
                </Button>
              )}
              <CertificateShareButton certificateCode={certificate.certificateCode} />
              <Button type="button" size="sm" variant="ghost" asChild>
                <a
                  href={certificatePublicShareUrl(certificate.certificateCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open public page
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
