import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchExpertsPublic, type ExpertPublicRecord } from '@/app/api/experts';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import Layout from '@/shared/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function ExpertsDirectoryPage() {
  const { t } = useTranslation('experts');
  const [items, setItems] = useState<ExpertPublicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const experts = await fetchExpertsPublic();
        if (!cancelled) setItems(experts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('profileUnavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">{t('expertsDirectory')}</h1>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-600">{t('noExpertsFound')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((expert) => (
            <Link key={expert.id} to={`/experts/${expert.slug}`}>
              <Card className="h-full transition hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-4">
                  {expert.avatarUrl ? (
                    <img
                      src={expert.avatarUrl}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <CardTitle>{expert.displayName}</CardTitle>
                    {expert.headline ? (
                      <p className="text-sm text-neutral-600">{expert.headline}</p>
                    ) : null}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicExpertsPage() {
  return (
    <Layout>
      <ExpertsDirectoryPage />
    </Layout>
  );
}

export function sanitizeDisplayedBio(bio: string | null | undefined): string {
  if (!bio) return '';
  return DOMPurify.sanitize(bio, { USE_PROFILES: { html: true } });
}
