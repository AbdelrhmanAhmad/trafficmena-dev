import { PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchAdminCommunityChannels, type AdminCommunityChannel } from '@/app/api/community';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function ChannelsAdminList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminCommunityChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await fetchAdminCommunityChannels());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Activity Channels</h1>
          <p className="mt-1 text-neutral-600">Manage member Activity Hub channels and access policies.</p>
        </div>
        <Button asChild>
          <Link to="/admin/community/channels/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New channel
          </Link>
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-600">No channels yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((channel) => (
            <Card
              key={channel.id}
              className="cursor-pointer transition hover:shadow-md"
              onClick={() => navigate(`/admin/community/channels/${channel.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{channel.nameEn}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{channel.channelType}</Badge>
                  {channel.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">
                <p dir="ltr" lang="en">
                  /dashboard/community/{channel.slug}
                </p>
                <p className="mt-2" dir="rtl" lang="ar">
                  {channel.nameAr}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityChannelsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <ChannelsAdminList />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
