import { Calendar } from 'lucide-react';
import { useParams } from 'react-router-dom';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useEvent } from '../../hooks/useEvents';

const AdminMeetupEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { data: event } = useEvent(id);

  return (
    <AdminLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Editing locked during migration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We removed the Supabase mutation logic to finish the API migration. Once the Hono
              admin endpoints are live you will be able to update events from here again.
            </p>
            {event && (
              <p>
                In the meantime, share updates for{' '}
                <span className="font-medium">{event.title}</span> with the engineering team and we
                will patch the record manually.
              </p>
            )}
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMeetupEdit;
