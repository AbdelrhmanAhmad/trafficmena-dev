import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FolderOpen, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TrackRecordingsSeriesRecord } from '@/app/api/tracks';
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
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';

type TrackRecordingsPublishCardProps = {
  trackId: string;
  recordingsSeries: TrackRecordingsSeriesRecord | null;
};

export function TrackRecordingsPublishCard({
  trackId,
  recordingsSeries,
}: TrackRecordingsPublishCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSeries = useUpdateSeries();
  const [priceEgp, setPriceEgp] = useState('');

  useEffect(() => {
    if (!recordingsSeries?.price_in_cents) {
      setPriceEgp('');
      return;
    }
    setPriceEgp(String(recordingsSeries.price_in_cents / 100));
  }, [recordingsSeries?.id, recordingsSeries?.price_in_cents]);

  if (!recordingsSeries) {
    return (
      <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-neutral-900">
            <FolderOpen className="h-5 w-5 text-[#05ef62]" />
            Publish Recordings for Sale
          </CardTitle>
          <CardDescription className="text-neutral-600">
            No recordings series is linked to this track yet. Create the track again or contact
            support if this track predates auto Series creation.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canEnableSale =
    recordingsSeries.asset_count > 0 && Number(priceEgp) > 0 && Number.isFinite(Number(priceEgp));

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
              priceInCents,
            }
          : {
              salesEnabled: false,
            },
      });
      await queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', trackId] });
      await queryClient.invalidateQueries({ queryKey: ['series', 'store'] });
    } catch {
      // Error toast handled by useUpdateSeries
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
          Only published recordings appear on <span className="font-medium">/recordings</span>.
          Buyers purchase recordings via the store — this does not reopen live track booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <p className="font-medium text-neutral-900">{recordingsSeries.title}</p>
          <p className="mt-1">
            {recordingsSeries.asset_count} recording
            {recordingsSeries.asset_count === 1 ? '' : 's'} attached
            {recordingsSeries.sales_enabled ? ' · Currently listed for sale' : ' · Not listed'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recordings-price-${trackId}`}>Sale price (EGP)</Label>
          <Input
            id={`recordings-price-${trackId}`}
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

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <div className="space-y-0.5 pr-4">
            <p className="text-sm font-medium text-neutral-900">Publish for sale</p>
            <p className="text-xs text-muted-foreground">
              Lists this track&apos;s recordings on /recordings for new buyers.
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
