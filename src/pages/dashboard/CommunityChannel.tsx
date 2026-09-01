import DOMPurify from 'dompurify';
import { ArrowLeft, Megaphone, Pin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  createCommunityPost,
  fetchCommunityChannel,
  fetchCommunityFeed,
  type CommunityAnnouncement,
  type CommunityChannel,
  type CommunityPost,
} from '@/app/api/community';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import { LazyEditor } from '@/shared/components/LazyEditor';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { formatMeetupDate } from '@/shared/utils/dateUtils';

const sanitizeConfig = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'blockquote'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

function RichHtml({ html, dir }: { html: string; dir?: string }) {
  const safe = DOMPurify.sanitize(html, sanitizeConfig);
  return (
    <div
      className="prose prose-neutral max-w-none text-sm"
      dir={dir}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-sanitized UGC with client DOMPurify defense-in-depth
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const { t, i18n } = useTranslation('community');

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        {post.author.avatarUrl ? (
          <img src={post.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium">
            {post.author.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{post.author.displayName}</CardTitle>
            {post.isPinned ? (
              <Badge variant="secondary" className="gap-1">
                <Pin className="h-3 w-3" />
                {t('channel.pinned')}
              </Badge>
            ) : null}
            {post.status === 'pending' ? (
              <Badge variant="outline">{t('channel.pending')}</Badge>
            ) : null}
          </div>
          <p className="text-xs text-neutral-500">
            {formatMeetupDate(post.publishedAt ?? post.createdAt)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.title ? <h3 className="font-semibold text-neutral-900">{post.title}</h3> : null}
        <RichHtml html={post.bodyHtml} dir={post.dir} />
        {post.imageUrl ? (
          <img src={post.imageUrl} alt="" className="max-h-80 rounded-lg object-cover" />
        ) : null}
        {post.linkUrl ? (
          <a href={post.linkUrl} className="text-sm text-[#29cf9f] hover:underline" target="_blank" rel="noreferrer">
            {post.linkUrl}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnnouncementCard({ item }: { item: CommunityAnnouncement }) {
  const { t, i18n } = useTranslation('community');

  return (
    <Card className="border-[#29cf9f]/30 bg-[#f4fff9]/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[#29cf9f]" />
          <Badge className="bg-[#29cf9f] text-[#101010]">{t('channel.announcementBadge')}</Badge>
        </div>
        <CardTitle>{item.title}</CardTitle>
        <p className="text-xs text-neutral-500">
          {item.publishedAt ? formatMeetupDate(item.publishedAt) : null}
        </p>
      </CardHeader>
      <CardContent>
        <RichHtml html={item.body} />
      </CardContent>
    </Card>
  );
}

function CommunityChannelPage() {
  const { slug = '' } = useParams();
  const { t, i18n } = useTranslation('community');

  const [channel, setChannel] = useState<CommunityChannel | null>(null);
  const [canPost, setCanPost] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const [channelRes, feedRes] = await Promise.all([
        fetchCommunityChannel(slug),
        fetchCommunityFeed(slug),
      ]);
      setChannel(channelRes.channel);
      setCanPost(channelRes.canPost);
      setPosts(feedRes.posts);
      setAnnouncements(feedRes.announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFeed'));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublish = async (asDraft: boolean) => {
    if (!slug || !bodyHtml.trim()) return;
    setSubmitting(true);
    try {
      await createCommunityPost(slug, {
        title: title.trim() || null,
        bodyHtml,
        localeHint: i18n.language === 'ar' ? 'ar' : 'en',
        status: asDraft ? 'draft' : 'published',
      });
      setTitle('');
      setBodyHtml('');
      setShowComposer(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.createPost'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout variant="member">
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !channel) {
    return (
      <AppLayout variant="member">
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link to="/dashboard/community">
              <ArrowLeft className="me-2 h-4 w-4" />
              {t('channel.back')}
            </Link>
          </Button>
          <p className="text-red-600">{error ?? t('errors.forbidden')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout variant="member">
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/dashboard/community">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('channel.back')}
          </Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <img src={channel.coverImageUrl} alt="" className="h-40 w-full object-cover" />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">{channel.name}</h1>
              <Badge variant="outline">{t(`types.${channel.channelType}`)}</Badge>
            </div>
            {channel.description ? (
              <p className="mt-2 text-neutral-600">{channel.description}</p>
            ) : null}
          </div>
        </div>

        {canPost ? (
          <div className="space-y-3">
            {!showComposer ? (
              <Button onClick={() => setShowComposer(true)}>{t('channel.writePost')}</Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('channel.writePost')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('channel.postTitle')}
                  />
                  <LazyEditor value={bodyHtml} onChange={setBodyHtml} maxLength={20000} />
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={submitting} onClick={() => void handlePublish(false)}>
                      {t('channel.publish')}
                    </Button>
                    <Button variant="outline" disabled={submitting} onClick={() => void handlePublish(true)}>
                      {t('channel.saveDraft')}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowComposer(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : channel.channelType === 'staff_post' ? (
          <p className="text-sm text-neutral-600">{t('channel.staffOnlyPost')}</p>
        ) : null}

        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard key={`ann-${item.id}`} item={item} />
          ))}
          {posts.length === 0 && announcements.length === 0 ? (
            <p className="text-neutral-600">{t('channel.noPosts')}</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default CommunityChannelPage;
