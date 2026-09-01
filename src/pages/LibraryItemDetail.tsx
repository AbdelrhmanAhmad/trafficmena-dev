import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Link2,
  Lock,
  Presentation,
  Video,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLibraryAsset } from '@/features/library/hooks/useLibrary';
import { trackDownloadContent, trackViewContent } from '@/lib/analytics/events';
import {
  resolveLibrarySeriesContext,
  shouldTrackInlineLibraryContent,
} from '@/lib/analytics/libraryContent';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import PremiumContentGate from '@/shared/components/PremiumContentGate';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import VideoEmbed from '@/shared/components/VideoEmbed';

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedDescription = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // Base direction follows content's first strong char so mixed AR/EN keeps correct word order
    dir="auto"
    // biome-ignore lint/security/noDangerouslySetInnerHtml: library descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const LibraryItemDetail: React.FC = () => {
  const { t, i18n } = useTranslation('library');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useLibraryAsset(id ?? '');
  const item = data ?? null;
  const hasAccess = item?.has_access ?? true;
  const isPremium = item?.is_premium ?? false;
  const access = { canView: hasAccess, canDownload: hasAccess };

  useEffect(() => {
    if (!id) {
      navigate('/dashboard/library', { replace: true });
    }
  }, [id, navigate]);

  const seriesContext = resolveLibrarySeriesContext(location.state);
  const backToLibrary = () => {
    if (seriesContext.seriesId) {
      navigate(`/dashboard/library/series/${seriesContext.seriesId}`);
      return;
    }
    navigate('/dashboard/library');
  };
  const trackedContentViewKeyRef = useRef('');
  useEffect(() => {
    if (!item || !id) return;
    if (!shouldTrackInlineLibraryContent(item)) return;

    const trackingKey = `${id}:${seriesContext.seriesId}`;
    if (trackedContentViewKeyRef.current === trackingKey) return;
    trackedContentViewKeyRef.current = trackingKey;

    trackViewContent({
      contentId: item.id,
      contentName: item.title,
      contentType: item.file_type,
      isPremium: item.is_premium ?? false,
      seriesId: seriesContext.seriesId,
      seriesName: seriesContext.seriesName,
      eventId: item.event_id ?? '',
    });
  }, [id, item, seriesContext.seriesId, seriesContext.seriesName]);

  const getIcon = (type: string, embedType?: string | null) => {
    if (embedType || type === 'Presentation') {
      return <Presentation className="h-6 w-6 text-purple-600" />;
    }
    if (type === 'Video') {
      return <Video className="h-6 w-6 text-blue-600" />;
    }
    return <FileText className="h-6 w-6 text-gray-600" />;
  };

  const formatFileTypeLabel = (fileType: string, embedType?: string | null) => {
    if (embedType || fileType === 'Presentation') return t('itemDetail.fileTypes.presentation');
    if (fileType === 'Video') return t('itemDetail.fileTypes.video');
    if (fileType === 'Document') return t('itemDetail.fileTypes.document');
    return fileType;
  };

  const formatEmbedProvider = (embedType: string) => {
    if (embedType === 'google_slides') return t('itemDetail.googleSlides');
    return embedType;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');

  const getEmbedContent = (url: string, type?: string | null) => {
    if (!url) return null;

    // For Google Slides, convert share URL to embed URL
    if (type === 'google_slides' && url.includes('docs.google.com/presentation')) {
      const embedUrl = url.replace('/edit', '/embed').replace('/view', '/embed');
      return (
        <iframe
          src={embedUrl}
          className="w-full h-[600px] rounded-lg"
          allowFullScreen={true}
          title={t('itemDetail.presentation')}
        />
      );
    }

    // For other embeds
    return (
      <iframe
        src={url}
        className="w-full h-[600px] rounded-lg"
        allowFullScreen={true}
        title={t('itemDetail.embeddedContent')}
      />
    );
  };

  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOWED_SCHEMES: ['http', 'https', 'mailto'],
    FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  };

  const getSanitizedDescription = (description: string | null) => {
    if (!description) return '';
    return DOMPurify.sanitize(description, sanitizeConfig);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text={t('itemDetail.loading')} />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('itemDetail.loadErrorTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : t('itemDetail.tryAgain')}
            </p>
            <Button onClick={backToLibrary}>
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {seriesContext.seriesId ? t('itemDetail.backToSeries') : t('itemDetail.backToRecordings')}
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!item) {
    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('itemDetail.notFoundTitle')}</h2>
            <p className="text-gray-600 mb-4">{t('itemDetail.notFoundDesc')}</p>
            <Button onClick={backToLibrary}>
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {seriesContext.seriesId ? t('itemDetail.backToSeries') : t('itemDetail.backToRecordings')}
            </Button>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // Restricted access - premium content uses a neutral gate page
  if (!access.canView) {
    if (isPremium) {
      return (
        <ProtectedRoute>
          <AppLayout variant="member">
            <PremiumContentGate contentName={item.title} />
          </AppLayout>
        </ProtectedRoute>
      );
    }

    return (
      <ProtectedRoute>
        <AppLayout variant="member">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={backToLibrary}
              className="mb-6 -ms-2 hover:bg-neutral-100 text-neutral-700"
            >
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
              {seriesContext.seriesId ? t('itemDetail.backToSeries') : t('itemDetail.backToRecordings')}
            </Button>

            <Card className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <Lock className="h-8 w-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">{item.title}</h1>
              </CardHeader>
              <CardContent className="text-center space-y-6 pt-4">
                <p className="text-neutral-600">
                  {t('itemDetail.exclusiveContent')}
                </p>

                {item.description && (
                  <div className="text-start border-t border-neutral-200 pt-6">
                    <h3 className="text-sm font-semibold text-neutral-700 mb-2">
                      {t('itemDetail.aboutContent')}
                    </h3>
                    <SanitizedDescription
                      className="text-sm text-neutral-600 leading-relaxed line-clamp-4"
                      html={getSanitizedDescription(item.description)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  {item.event_id && (
                    <Button
                      asChild
                      className="bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] hover:shadow-xl"
                    >
                      <Link to={`/meetups/${item.event_id}`}>{t('itemDetail.registerForEvent')}</Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate('/dashboard/meetups')}>
                    {t('itemDetail.browseAllEvents')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <Button
            variant="ghost"
            onClick={backToLibrary}
            className="mb-6 -ms-2 hover:bg-neutral-100 text-neutral-700"
          >
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {seriesContext.seriesId ? t('itemDetail.backToSeries') : t('itemDetail.backToRecordings')}
          </Button>

          <Card className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-neutral-900 mb-4">{item.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      {getIcon(item.file_type, item.embed_type)}
                      <span className="font-medium">
                        {formatFileTypeLabel(item.file_type, item.embed_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('itemDetail.addedOn', { date: formatDate(item.created_at) })}</span>
                    </div>
                    {item.event_id && (
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        <span>
                          {t('itemDetail.linkedEventId')}: {item.event_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Video Section */}
              {item.video_url && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Video className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-neutral-900">{t('itemDetail.videoContent')}</h2>
                  </div>
                  <div className="w-full rounded-xl overflow-hidden bg-neutral-900">
                    <VideoEmbed url={item.video_url} />
                  </div>
                </div>
              )}

              {/* Presentation Section */}
              {item.embed_url && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                      <Presentation className="h-4 w-4 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-neutral-900">{t('itemDetail.presentation')}</h2>
                  </div>
                  <div className="rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200">
                    {getEmbedContent(item.embed_url, item.embed_type)}
                  </div>
                </div>
              )}

              {/* Document Section - Download Only */}
              {item.document_url && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">{t('itemDetail.document')}</h2>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-neutral-200">
                          <FileText className="h-6 w-6 text-neutral-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900">{t('itemDetail.documentAttached')}</h3>
                          <p className="text-sm text-neutral-500">{t('itemDetail.documentHint')}</p>
                        </div>
                      </div>
                      {access.canDownload ? (
                        <a
                          href={item.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] text-[#101010] font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                          onClick={() =>
                            trackDownloadContent({
                              contentId: item.id,
                              contentName: item.title,
                              contentType: item.file_type,
                              isPremium: item.is_premium ?? false,
                            })
                          }
                        >
                          <Download className="h-4 w-4" />
                          {t('itemDetail.download')}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-400 font-medium cursor-not-allowed">
                          <Download className="h-4 w-4" />
                          {t('itemDetail.restricted')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="prose prose-gray max-w-none">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-3">{t('itemDetail.description')}</h2>
                  <SanitizedDescription
                    className="text-neutral-700 leading-relaxed"
                    html={getSanitizedDescription(item.description)}
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">{t('itemDetail.details')}</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('itemDetail.primaryType')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">
                      {formatFileTypeLabel(item.file_type, item.embed_type)}
                    </dd>
                  </div>
                  {item.embed_type && (
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">{t('itemDetail.embedProvider')}</dt>
                      <dd className="mt-1 text-sm text-neutral-900">
                        {formatEmbedProvider(item.embed_type)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('itemDetail.published')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{formatDateTime(item.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('itemDetail.downloads')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{item.download_count ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">{t('itemDetail.views')}</dt>
                    <dd className="mt-1 text-sm text-neutral-900">{item.view_count ?? 0}</dd>
                  </div>
                  {item.event_id && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">{t('itemDetail.linkedEventId')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{item.event_id}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default LibraryItemDetail;
