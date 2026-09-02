import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchExpertBySlug } from '@/app/api/experts';
import { getExpertLinkedContentHref } from '@/pages/experts/expertPublicLinks';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import Layout from '@/shared/components/layout/Layout';
import { useAuth } from '@/shared/context/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function LinkedContentTitle({ href, title }: { href: string | null; title: string }) {
  if (href) {
    return (
      <Link to={href} className="hover:underline">
        {title}
      </Link>
    );
  }
  return <span>{title}</span>;
}

function ExpertProfilePage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation('experts');
  const isAuthenticated = Boolean(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchExpertBySlug>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchExpertBySlug(slug);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('profileUnavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  if (loading) return <LoadingSpinner />;
  if (error || !profile) {
    return <p className="px-4 py-16 text-center text-neutral-600">{t('profileUnavailable')}</p>;
  }

  const expert = profile.expert as {
    displayName: string;
    headline?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    websiteUrl?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
  };

  const safeBio = expert.bio ? DOMPurify.sanitize(expert.bio, { USE_PROFILES: { html: true } }) : '';

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <Button type="button" variant="outline" asChild>
        <Link to="/experts">{t('backToExperts')}</Link>
      </Button>

      <div className="flex flex-col items-start gap-6 sm:flex-row">
        {expert.avatarUrl ? (
          <img src={expert.avatarUrl} alt="" className="h-32 w-32 rounded-full object-cover" />
        ) : null}
        <div>
          <h1 className="text-3xl font-bold">{expert.displayName}</h1>
          {expert.headline ? <p className="mt-2 text-lg text-neutral-700">{expert.headline}</p> : null}
        </div>
      </div>

      {safeBio ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('aboutTheExpert')}</h2>
          <div
            className="prose max-w-none text-neutral-800"
            dangerouslySetInnerHTML={{ __html: safeBio }}
          />
        </section>
      ) : null}

      {profile.skills.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('expertise')}</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span key={skill.id} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {(expert.websiteUrl || expert.linkedinUrl || expert.twitterUrl) && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{t('profile')}</h2>
          <ul className="space-y-1 text-sm">
            {expert.websiteUrl ? (
              <li>
                <a href={expert.websiteUrl} target="_blank" rel="noreferrer noopener">
                  {t('website')}
                </a>
              </li>
            ) : null}
            {expert.linkedinUrl ? (
              <li>
                <a href={expert.linkedinUrl} target="_blank" rel="noreferrer noopener">
                  {t('linkedin')}
                </a>
              </li>
            ) : null}
            {expert.twitterUrl ? (
              <li>
                <a href={expert.twitterUrl} target="_blank" rel="noreferrer noopener">
                  {t('twitter')}
                </a>
              </li>
            ) : null}
          </ul>
        </section>
      )}

      {profile.events.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('relatedEvents')}</h2>
          <div className="grid gap-3">
            {profile.events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <LinkedContentTitle
                      href={getExpertLinkedContentHref('event', event.id, isAuthenticated)}
                      title={event.title}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-600">
                  {new Date(event.date).toLocaleString()}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {profile.tracks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('relatedTracks')}</h2>
          <div className="grid gap-3">
            {profile.tracks.map((track) => (
              <Card key={track.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <LinkedContentTitle
                      href={getExpertLinkedContentHref('track', track.id, isAuthenticated)}
                      title={track.title}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {profile.series.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('relatedSeries')}</h2>
          <div className="grid gap-3">
            {profile.series.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <LinkedContentTitle
                      href={getExpertLinkedContentHref('series', item.id, isAuthenticated)}
                      title={item.title}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {profile.masterclasses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('relatedMasterclasses')}</h2>
          <div className="grid gap-3">
            {profile.masterclasses.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <LinkedContentTitle
                      href={getExpertLinkedContentHref('masterclass', item.id, isAuthenticated)}
                      title={item.title}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {profile.libraryAssets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('relatedLibraryAssets')}</h2>
          <div className="grid gap-3">
            {profile.libraryAssets.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <LinkedContentTitle
                      href={getExpertLinkedContentHref('libraryAsset', item.id, isAuthenticated)}
                      title={item.title}
                    />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function PublicExpertDetailPage() {
  return (
    <Layout>
      <ExpertProfilePage />
    </Layout>
  );
}
