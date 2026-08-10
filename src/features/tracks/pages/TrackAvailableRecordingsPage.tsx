import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePublicTrack } from '@/features/tracks/hooks/useTracks';
import { ParentRecordingsBuyPage } from '@/features/tracks/pages/TrackRecordingsPage';
import Layout from '@/shared/components/layout/Layout';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';

const TrackAvailableRecordingsPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePublicTrack(id);

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading recordings..." />
      </Layout>
    );
  }

  const series = data?.track.recordings_series;
  if (isError || !data?.track || !series?.is_sellable) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">
            Recordings are not available for this track yet.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(id ? `/tracks/${id}` : '/tracks')}
          >
            Back to track
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <ParentRecordingsBuyPage
      seriesId={series.id}
      backPath={`/tracks/${id}`}
      backLabel="Back to track"
      returnPath={`/tracks/${id}/recordings`}
    />
  );
};

export default TrackAvailableRecordingsPage;
