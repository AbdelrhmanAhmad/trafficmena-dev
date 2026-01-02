import { Calendar } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { AdminEventForm } from '../../components/AdminEventForm';
import { useDeleteEvent, useEvent, useUpdateEvent } from '../../hooks/useEvents';

const AdminMeetupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(id);
  const updateMutation = useUpdateEvent(id ?? '');
  const deleteMutation = useDeleteEvent();
  const { canDeleteContent } = useRolePermissions();

  useEffect(() => {
    if (!id) {
      navigate('/admin/meetups', { replace: true });
    }
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">
                    {event ? `Edit ${event.title}` : 'Edit event'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Update the details below and publish instantly to members.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataLoader
                loading={isLoading}
                error={error ? 'Unable to load event details.' : null}
                loadingText="Loading event..."
              >
                {event ? (
                  <AdminEventForm
                    event={event}
                    submitLabel="Update event"
                    isSubmitting={updateMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                    canDelete={canDeleteContent}
                    onSubmit={async (payload) => {
                      try {
                        await updateMutation.mutateAsync(payload);
                      } catch {
                        // handled by toast inside mutation hook
                      }
                    }}
                    onDelete={async () => {
                      if (!canDeleteContent) {
                        return;
                      }
                      const confirmed = window.confirm(
                        'Delete this event? This action cannot be undone.',
                      );
                      if (!confirmed) {
                        return;
                      }
                      try {
                        await deleteMutation.mutateAsync(event.id);
                        navigate('/admin/meetups');
                      } catch {
                        // toast displayed by mutation hook
                      }
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This event could not be found. It may have been removed.
                  </p>
                )}
              </DataLoader>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AdminProtectedRoute>
  );
};

export default AdminMeetupEdit;
