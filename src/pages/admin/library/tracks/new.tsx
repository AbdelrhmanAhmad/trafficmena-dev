import { ArrowLeft, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrackForm from '@/features/tracks/components/TrackForm';
import { useCreateTrack } from '@/features/tracks/hooks/useTracks';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
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
    priceEgp?: string;
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
      priceInCents: values.priceEgp ? Math.round(Number(values.priceEgp) * 100) : null,
    });
    navigate('/admin/meetups?tab=tracks');
  };

  const handleCancel = () => {
    navigate('/admin/meetups?tab=tracks');
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/meetups')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
                <Layers className="h-5 w-5 text-[#05ef62]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Create Event Track</h1>
                <p className="text-neutral-600">
                  Bundle related events into a bookable track for members.
                </p>
              </div>
            </div>
          </div>

          <Card className="max-w-3xl rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg text-neutral-900">Track Details</CardTitle>
              <CardDescription className="text-neutral-600">
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
      </AppLayout>
    </AdminProtectedRoute>
  );
}

export default NewTrackPage;
