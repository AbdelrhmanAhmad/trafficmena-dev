import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RecordingsSeriesSummaryRecord } from '@/app/api/tracks';
import { useUpdateSeries } from '@/features/series/hooks/useSeries';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';

type AccessPolicy = 'free_for_prior_buyers' | 'everyone_pays';

type TrackRecordingsPublishCardProps = {
  trackId?: string;
  recordingsSeries: RecordingsSeriesSummaryRecord | null;
  eventId?: string;
  scope?: 'track' | 'standalone-event';
};

export function TrackRecordingsPublishCard({
  trackId,
  recordingsSeries,
  eventId,
  scope = trackId ? 'track' : 'standalone-event',
}: TrackRecordingsPublishCardProps) {
  const formId = eventId ?? trackId ?? recordingsSeries?.id ?? 'recordings';
  const isStandaloneEvent = scope === 'standalone-event';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSeries = useUpdateSeries();
  const [priceEgp, setPriceEgp] = useState('');
  const [policy, setPolicy] = useState<AccessPolicy>('free_for_prior_buyers');

  useEffect(() => {
    if (!recordingsSeries?.price_in_cents) {
      setPriceEgp('');
      return;
    }
    setPriceEgp(String(recordingsSeries.price_in_cents / 100));
  }, [recordingsSeries?.id, recordingsSeries?.price_in_cents]);

  useEffect(() => {
    setPolicy(recordingsSeries?.recordings_access_policy ?? 'free_for_prior_buyers');
  }, [recordingsSeries?.id, recordingsSeries?.recordings_access_policy]);

  if (!recordingsSeries) {
    return (
      <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
            <FolderOpen className="h-5 w-5 text-[#05ef62]" />
            Publish Recordings for Sale
          </CardTitle>
          <CardDescription className="text-neutral-600">
            {isStandaloneEvent
              ? 'No recordings series is linked to this event yet. Save the event again or contact support if this event predates auto Series creation.'
              : 'No recordings series is linked to this track yet. Create the track again or contact support if this track predates auto Series creation.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canEnableSale =
    recordingsSeries.asset_count > 0 && Number(priceEgp) > 0 && Number.isFinite(Number(priceEgp));

  const invalidateRelated = async () => {
    if (trackId) {
      await queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      await queryClient.invalidateQueries({ queryKey: ['tracks', 'public', 'detail', trackId] });
    }
    await queryClient.invalidateQueries({ queryKey: ['series', 'store'] });
    if (eventId) {
      await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !canEnableSale) {
      toast({
        title: 'Cannot publish recordings for sale',
        description:
          'Add at least one recording asset and set a price greater than 0 EGP, then try again.',
        variant: 'destructive',
      });
      return;
    }

    const priceInCents = Math.round(Number(priceEgp || 0) * 100);

    try {
      await updateSeries.mutateAsync({
        id: recordingsSeries.id,
        data: enabled
          ? {
              salesEnabled: true,
              isPublished: true,
              isPremium: true,
              priceInCents,
              recordingsAccessPolicy: policy,
            }
          : {
              salesEnabled: false,
              recordingsAccessPolicy: policy,
            },
      });
      await invalidateRelated();
    } catch {
      // Error toast handled by useUpdateSeries
    }
  };

  const handlePolicyChange = async (next: AccessPolicy) => {
    setPolicy(next);
    if (!recordingsSeries.sales_enabled) return;
    try {
      await updateSeries.mutateAsync({
        id: recordingsSeries.id,
        data: { recordingsAccessPolicy: next },
      });
      await invalidateRelated();
    } catch {
      setPolicy(recordingsSeries.recordings_access_policy);
    }
  };

  return (
    <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
          <FolderOpen className="h-5 w-5 text-[#05ef62]" />
          Publish Recordings for Sale
        </CardTitle>
        <CardDescription className="text-neutral-600">
          {isStandaloneEvent
            ? 'After this event ends, members can buy its recording from the public event page. This does not reopen live event registration.'
            : 'After the live booking window ends, members can buy this track\'s recordings package. This does not reopen live track booking.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <p className="font-medium text-neutral-900">{recordingsSeries.title}</p>
          <p className="mt-1">
            {recordingsSeries.asset_count} recording
            {recordingsSeries.asset_count === 1 ? '' : 's'} attached
            {typeof recordingsSeries.event_asset_count === 'number'
              ? ` · ${recordingsSeries.event_asset_count} for this event`
              : ''}
            {recordingsSeries.sales_enabled ? ' · Currently listed for sale' : ' · Not listed'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recordings-price-${formId}`}>Price (EGP)</Label>
          <Input
            id={`recordings-price-${formId}`}
            inputMode="decimal"
            placeholder="e.g. 150"
            value={priceEgp}
            onChange={(event) => setPriceEgp(event.target.value)}
            disabled={updateSeries.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Required to publish for sale. Must be greater than 0.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recordings-policy-${formId}`}>Prior buyers access</Label>
          <Select
            value={policy}
            onValueChange={(value) => void handlePolicyChange(value as AccessPolicy)}
            disabled={updateSeries.isPending}
          >
            <SelectTrigger id={`recordings-policy-${formId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free_for_prior_buyers">
                {isStandaloneEvent
                  ? 'Free for prior event registrants (default)'
                  : 'Free for prior track/event buyers (default)'}
              </SelectItem>
              <SelectItem value="everyone_pays">Everyone pays</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isStandaloneEvent
              ? 'Controls whether people who already registered for this live event get complimentary recordings access.'
              : 'Controls whether people who already booked the live track (or attended its events) get complimentary recordings access.'}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <div className="space-y-0.5 pr-4">
            <p className="text-sm font-medium text-neutral-900">Publish for sale</p>
            <p className="text-xs text-muted-foreground">
              Shows a &quot;Buy Recordings&quot; button on the ended event public page.
            </p>
          </div>
          <Switch
            checked={recordingsSeries.sales_enabled}
            onCheckedChange={handleToggle}
            disabled={updateSeries.isPending}
          />
        </div>

        {updateSeries.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => navigate(`/admin/library/series/${recordingsSeries.id}`)}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage recording assets
        </Button>
      </CardContent>
    </Card>
  );
}
