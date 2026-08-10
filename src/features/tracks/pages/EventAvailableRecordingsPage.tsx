import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvent } from '@/features/events/hooks/useEvents';
import { ParentRecordingsBuyPage } from '@/features/tracks/pages/TrackRecordingsPage';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';

const EventAvailableRecordingsPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, isError } = useEvent(id);

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading recordings..." />
      </Layout>
    );
  }

  const series = event?.recordings_series;
  const hasEventAssets = (series?.event_asset_count ?? 0) > 0;
  if (isError || !event || !series?.is_sellable || !hasEventAssets) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">
            Recordings are not available for this event yet.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(id ? `/meetups/${id}` : '/meetups')}
          >
            Back to event
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <ParentRecordingsBuyPage
      seriesId={series.id}
      backPath={`/meetups/${id}`}
      backLabel="Back to event"
      returnPath={`/meetups/${id}/recordings`}
      filterEventId={id}
    />
  );
};

export default EventAvailableRecordingsPage;
