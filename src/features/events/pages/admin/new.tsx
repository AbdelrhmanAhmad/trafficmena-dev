import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AdminEventForm } from '../../components/AdminEventForm';
import { useCreateEvent } from '../../hooks/useEvents';

const AdminMeetupsNew = () => {
  const navigate = useNavigate();
  const createEventMutation = useCreateEvent();

  return (
    <AdminLayout>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CalendarPlus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold">Add a new event</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Publish upcoming workshops, meetups, or masterminds directly from the dashboard.
                </p>
                <p className="text-xs text-muted-foreground">
                  Need a refresher? Follow the checklist in{' '}
                  <code>docs/admin-content-workflow.md</code>.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AdminEventForm
              submitLabel="Create event"
              isSubmitting={createEventMutation.isPending}
              onSubmit={async (payload) => {
                try {
                  const event = await createEventMutation.mutateAsync(payload);
                  navigate(`/admin/events/${event.id}`);
                } catch {
                  // Toast surfaced via mutation hook
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMeetupsNew;
