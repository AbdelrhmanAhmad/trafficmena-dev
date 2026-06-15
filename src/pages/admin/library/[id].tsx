import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit2,
  FileText,
  Link2,
  Presentation,
  Trash2,
  Video,
} from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteLibraryAsset, useLibraryAsset } from '@/features/library/hooks/useLibrary';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
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
    // biome-ignore lint/security/noDangerouslySetInnerHtml: admin descriptions are sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

const AdminLibraryItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useLibraryAsset(id ?? '');
  const deleteMutation = useDeleteLibraryAsset();
  const { canDeleteContent } = useRolePermissions();
  const item = data ?? null;

  useEffect(() => {
    if (!id) {
      navigate('/admin/library', { replace: true });
    }
  }, [id, navigate]);

  const handleEdit = () => {
    navigate(`/admin/library/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this library item?')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id as string);
      navigate('/admin/library');
    } catch {
      // Toast surfaced by mutation handler
    }
  };

  const getIcon = (type: string, embedType?: string | null) => {
    if (embedType || type === 'Presentation') {
      return <Presentation className="h-6 w-6 text-purple-600" />;
    }
    if (type === 'Video') {
      return <Video className="h-6 w-6 text-blue-600" />;
    }
    return <FileText className="h-6 w-6 text-gray-600" />;
  };

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
          title="Presentation"
        />
      );
    }

    // For other embeds
    return (
      <iframe
        src={url}
        className="w-full h-[600px] rounded-lg"
        allowFullScreen
        title="Embedded Content"
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
      <AppLayout variant="admin">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading library item..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout variant="admin">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load item</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : 'The library service is unavailable right now.'}
          </p>
          <Button onClick={() => navigate('/admin/library')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library Management
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout variant="admin">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Item not found</h2>
          <p className="text-gray-600 mb-4">The requested library item could not be found.</p>
          <Button onClick={() => navigate('/admin/library')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library Management
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout variant="admin">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/library')}
            className="-ml-2 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library Management
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit} disabled={deleteMutation.isPending}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {canDeleteContent && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{item.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {getIcon(item.file_type, item.embed_type)}
                    <span className="font-medium">
                      {item.embed_type ? 'Presentation' : item.file_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  {item.event_id && (
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <span>Linked event ID: {item.event_id}</span>
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
                  <Video className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Video Content</h2>
                </div>
                <div className="rounded-lg overflow-hidden bg-gray-50 border">
                  <VideoEmbed url={item.video_url} />
                </div>
              </div>
            )}

            {/* Presentation Section */}
            {item.embed_url && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Presentation className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Presentation</h2>
                </div>
                <div className="rounded-lg overflow-hidden bg-gray-50 border">
                  {getEmbedContent(item.embed_url, item.embed_type)}
                </div>
              </div>
            )}

            {/* Document Section */}
            {item.document_url && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Document</h2>
                </div>
                <div className="rounded-lg border bg-gray-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-gray-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">PDF Document Available</h3>
                        <p className="text-sm text-gray-600">
                          Click to download or view the attached document
                        </p>
                      </div>
                    </div>
                    <a
                      href={item.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </div>
                  {/* PDF Viewer */}
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={item.document_url}
                      className="w-full h-[600px]"
                      title="PDF Document"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="prose prose-gray max-w-none">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                <SanitizedDescription
                  className="text-gray-700 leading-relaxed"
                  html={getSanitizedDescription(item.description)}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {item.embed_type ? 'Presentation' : item.file_type}
                  </dd>
                </div>
                {item.embed_type && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Embed Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {item.embed_type === 'google_slides' ? 'Google Slides' : item.embed_type}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(item.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Downloads</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.download_count ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Views</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.view_count ?? 0}</dd>
                </div>
                {item.event_id && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Linked Event ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{item.event_id}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Library Asset ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{item.id}</dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminLibraryItemDetail;
