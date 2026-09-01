import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveCommunityPost,
  fetchAdminCommunityChannels,
  fetchPendingCommunityPosts,
  rejectCommunityPost,
  type AdminCommunityChannel,
  type CommunityPost,
} from '@/app/api/community';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function PendingPostsModerationPage() {
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [channels, setChannels] = useState<AdminCommunityChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const reload = async () => {
    const [pending, channelList] = await Promise.all([
      fetchPendingCommunityPosts(),
      fetchAdminCommunityChannels(),
    ]);
    setItems(pending);
    setChannels(channelList);
  };

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pending posts');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const channelName = (channelId: string) =>
    channels.find((c) => c.id === channelId)?.nameEn ?? channelId;

  const handleApprove = async (postId: string) => {
    setActingId(postId);
    try {
      await approveCommunityPost(postId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (postId: string) => {
    setActingId(postId);
    try {
      await rejectCommunityPost(postId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pending posts</h1>
          <p className="mt-1 text-neutral-600">Review member posts awaiting approval before they appear in channel feeds.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/community/channels">Channels</Link>
        </Button>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-600">No pending posts.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((post) => {
            const safeHtml = DOMPurify.sanitize(post.bodyHtml, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
              ALLOWED_ATTR: ['href', 'target', 'rel'],
            });
            return (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{post.title || 'Untitled post'}</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-neutral-600">
                      <span>{post.author.displayName}</span>
                      <span>·</span>
                      <span>{channelName(post.channelId)}</span>
                      <span>·</span>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {post.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={actingId === post.id}
                      onClick={() => void handleApprove(post.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actingId === post.id}
                      onClick={() => void handleReject(post.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none text-neutral-800"
                    dir={post.dir}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: server-sanitized preview with DOMPurify
                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityModerationPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <PendingPostsModerationPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
