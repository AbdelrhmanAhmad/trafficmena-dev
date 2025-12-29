import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrackForm from '@/features/tracks/components/TrackForm';
import { useCreateTrack } from '@/features/tracks/hooks/useTracks';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

function NewTrackPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTrack();

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    imageUrl?: string;
    isPublished: boolean;
    maxTrackBookings?: number | null;
    trackBookingStart?: string | null;
    trackBookingEnd?: string | null;
    singleBookingStart?: string | null;
    singleBookingEnd?: string | null;
  }) => {
    await createMutation.mutateAsync({
      title: values.title,
      description: values.description || null,
      imageUrl: values.imageUrl || null,
      isPublished: values.isPublished,
      maxTrackBookings: values.maxTrackBookings ?? null,
      trackBookingStart: values.trackBookingStart || null,
      trackBookingEnd: values.trackBookingEnd || null,
      singleBookingStart: values.singleBookingStart || null,
      singleBookingEnd: values.singleBookingEnd || null,
    });
    navigate('/admin/meetups?tab=tracks');
  };

  const handleCancel = () => {
    navigate('/admin/meetups?tab=tracks');
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/meetups')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Event Track</h1>
              <p className="text-muted-foreground">
                Bundle related events into a bookable track for members.
              </p>
            </div>
          </div>

          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Track Details</CardTitle>
              <CardDescription>
                Enter the basic information for your new learning track.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrackForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={createMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default NewTrackPage;
