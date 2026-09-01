import {
  Award,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  certificatePublicDownloadUrl,
  certificatePublicViewUrl,
} from '@/app/api/certificates';
import { CertificatePublicPreview } from '@/features/certificates/components/CertificatePublicPreview';
import { usePublicCertificate } from '@/features/certificates/hooks/useCertificates';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

function formatIssueDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PublicCertificatePage() {
  const { t } = useTranslation('dashboard');
  const { code } = useParams<{ code: string }>();
  const normalizedCode = code?.trim().toUpperCase() ?? '';
  const { data, isLoading, isError, error } = usePublicCertificate(normalizedCode);

  if (!normalizedCode) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>{t('certificates.invalidLinkTitle')}</CardTitle>
              <CardDescription>{t('certificates.invalidLinkDesc')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" text={t('certificates.verifying')} />
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    const message =
      error instanceof Error ? error.message : t('certificates.notFoundDefault');
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="h-5 w-5" />
                {t('certificates.notFound')}
              </CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" asChild>
                <Link to="/">{t('certificates.backHome')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isRevoked = data.status === 'revoked';
  const heading = data.certificateTitle || t('certificates.defaultTitle');

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Award className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">
            {t('certificates.verificationTitle')}
          </h1>
          <p className="mt-2 text-neutral-600">{t('certificates.verificationSubtitle')}</p>
        </div>

        {!isRevoked && data.preview && (
          <div className="mb-8">
            <CertificatePublicPreview
              backgroundImageUrl={data.preview.backgroundImageUrl}
              settings={data.preview.settings}
              studentName={data.studentName}
              courseTitle={data.masterclassTitle}
              issueDate={formatIssueDate(data.issueDate)}
              certificateCode={data.certificateCode}
            />
          </div>
        )}

        <Card className="overflow-hidden rounded-2xl border-amber-200/60 shadow-lg">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-[#29cf9f] to-amber-400" />
          <CardHeader className="space-y-3 bg-gradient-to-br from-amber-50/80 to-white pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={isRevoked ? 'bg-red-500' : 'bg-[#29cf9f]'}>
                {isRevoked ? t('certificates.revoked') : t('certificates.verified')}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {data.certificateCode}
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl">{heading}</CardTitle>
            {data.certificateDescription && (
              <CardDescription className="text-base text-neutral-600">
                {data.certificateDescription}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6 p-6 md:p-8">
            {isRevoked ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {t('certificates.revokedMessage')}
              </div>
            ) : (
              <>
                <dl className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-xl border bg-neutral-50/80 p-4">
                    <dt className="mb-1 flex items-center gap-2 text-sm text-neutral-500">
                      <User className="h-4 w-4" />
                      {t('certificates.studentName')}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">{data.studentName}</dd>
                  </div>
                  <div className="rounded-xl border bg-neutral-50/80 p-4">
                    <dt className="mb-1 flex items-center gap-2 text-sm text-neutral-500">
                      <Award className="h-4 w-4" />
                      {t('certificates.masterclass')}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {data.masterclassTitle}
                    </dd>
                  </div>
                  <div className="rounded-xl border bg-neutral-50/80 p-4 sm:col-span-2">
                    <dt className="mb-1 flex items-center gap-2 text-sm text-neutral-500">
                      <Calendar className="h-4 w-4" />
                      {t('certificates.issueDate')}
                    </dt>
                    <dd className="text-lg font-semibold text-neutral-900">
                      {formatIssueDate(data.issueDate)}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-3 border-t pt-6">
                  {data.hasGeneratedPdf && (
                    <>
                      <Button type="button" asChild>
                        <a
                          href={certificatePublicViewUrl(data.certificateCode)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t('certificates.viewCertificate')}
                        </a>
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <a href={certificatePublicDownloadUrl(data.certificateCode)}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('certificates.downloadPdf')}
                        </a>
                      </Button>
                    </>
                  )}
                  {data.externalCertificateUrl && (
                    <Button type="button" variant="outline" asChild>
                      <a
                        href={data.externalCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('certificates.externalCertificate')}
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-neutral-500">
          {t('certificates.codeLabel')}{' '}
          <span className="font-mono">{data.certificateCode}</span>
        </p>
      </div>
    </Layout>
  );
}
