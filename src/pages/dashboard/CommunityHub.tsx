import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchCommunityChannels, type CommunityChannel } from '@/app/api/community';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function CommunityHubPage() {
  const { t } = useTranslation('community');
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const items = await fetchCommunityChannels();
        setChannels(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.loadChannels'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  return (
    <AppLayout variant="member">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('hub.title')}</h1>
          <p className="mt-1 text-neutral-600">{t('hub.subtitle')}</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageCircle className="mb-4 h-10 w-10 text-neutral-400" />
              <p className="text-neutral-600">{t('hub.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <Link key={channel.id} to={`/dashboard/community/${channel.slug}`} className="block">
                <Card className="h-full overflow-hidden transition hover:shadow-md">
                  <img src={channel.coverImageUrl} alt="" className="h-32 w-full object-cover" />
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <Badge variant="outline">{t(`types.${channel.channelType}`)}</Badge>
                    </div>
                  </CardHeader>
                  {channel.description ? (
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-neutral-600">{channel.description}</p>
                    </CardContent>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default CommunityHubPage;
