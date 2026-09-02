import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchNotificationDeliveries,
  retryNotificationDelivery,
  type NotificationDelivery,
} from '@/app/api/notifications';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

function isRetryable(item: NotificationDelivery) {
  if (item.status === 'failed') return true;
  return item.status === 'skipped' && item.skipReason === 'provider_not_configured';
}

function DeliveriesAdminPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<NotificationDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [channel, setChannel] = useState(searchParams.get('channel') ?? '');
  const [eventType, setEventType] = useState(searchParams.get('eventType') ?? '');
  const [campaignId, setCampaignId] = useState(searchParams.get('campaignId') ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const reload = async (
    nextOffset = offset,
    overrides?: { campaignId?: string },
  ) => {
    setLoading(true);
    const effectiveCampaignId =
      overrides?.campaignId !== undefined ? overrides.campaignId : campaignId;
    try {
      const data = await fetchNotificationDeliveries({
        status: status || undefined,
        channel: channel || undefined,
        eventType: eventType || undefined,
        campaignId: effectiveCampaignId || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        limit,
        offset: nextOffset,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setOffset(nextOffset);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get('campaignId') ?? '';
    if (fromUrl) setCampaignId(fromUrl);
    void reload(0, { campaignId: fromUrl || campaignId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + URL campaign filter
  }, [searchParams]);

  const handleRetry = async (id: string) => {
    try {
      await retryNotificationDelivery(id);
      await reload(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Delivery Logs</h1>
        <p className="mt-1 text-neutral-600">
          View and retry notification deliveries. Destinations are masked; deletion is not allowed.
        </p>
      </div>

      {error ? <p className="text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="del-status">Status</Label>
            <select
              id="del-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any</option>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
              <option value="skipped">skipped</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-channel">Channel</Label>
            <select
              id="del-channel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="">Any</option>
              <option value="email">email</option>
              <option value="whatsapp">whatsapp</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-event">Event type</Label>
            <Input
              id="del-event"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="announcement"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-campaign">Campaign ID</Label>
            <Input
              id="del-campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-from">From</Label>
            <Input
              id="del-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-to">To</Label>
            <Input
              id="del-to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void reload(0)}>
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Results ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b text-neutral-500">
                  <th className="p-2 font-medium">Created</th>
                  <th className="p-2 font-medium">Channel</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Destination</th>
                  <th className="p-2 font-medium">Event</th>
                  <th className="p-2 font-medium">Campaign</th>
                  <th className="p-2 font-medium">Error / skip</th>
                  <th className="p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b align-top">
                    <td className="p-2 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">{item.channel}</td>
                    <td className="p-2">
                      <Badge variant="outline">{item.status}</Badge>
                    </td>
                    <td className="p-2 font-mono text-xs">{item.destinationMasked ?? '—'}</td>
                    <td className="p-2">{item.eventType}</td>
                    <td className="p-2">
                      {item.campaignId ? (
                        <Link
                          className="text-primary underline"
                          to={`/admin/notifications/deliveries?campaignId=${item.campaignId}`}
                        >
                          {item.campaignId.slice(0, 8)}…
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-2 text-xs text-neutral-600">
                      {item.skipReason || item.lastErrorMessage || '—'}
                    </td>
                    <td className="p-2">
                      {isRetryable(item) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRetry(item.id)}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 ? (
              <p className="mt-4 text-neutral-500">No deliveries found.</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={offset <= 0}
                onClick={() => void reload(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={offset + limit >= total}
                onClick={() => void reload(offset + limit)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminNotificationDeliveriesPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <DeliveriesAdminPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
