import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const AdminMeetupsNew = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-2xl">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Event creation is paused</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We retired the Supabase write path and the replacement Hono endpoint is in progress.
              Until it ships, new events will be seeded manually by the core team. This keeps the
              MVP safe while we validate demand.
            </p>
            <p>
              Need to run an event sooner? Drop the details in Notion or Slack and we will publish
              it directly in the database.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/admin/meetups')} variant="outline">
                Back to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMeetupsNew;
