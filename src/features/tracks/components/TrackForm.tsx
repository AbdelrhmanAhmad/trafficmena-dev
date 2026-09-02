import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateTrackPayload } from '@/app/api/tracks';
import { EventExpertPicker } from '@/features/experts/components/EventExpertPicker';
import { uploadFile } from '@/app/api/uploads';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import { BilingualTextField } from '@/shared/components/admin/BilingualTextField';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { cairoLocalToUtcIso, toCairoDatetimeLocal } from '@/shared/utils/dateUtils';
import type { Track } from '../types';

const egpPriceSchema = z
  .string()
  .optional()
  .refine(
    (value) =>
      !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
    'Price must be between 0 and 100,000 EGP.',
  );

const trackFormSchema = z
  .object({
    titleEn: z
      .string()
      .trim()
      .min(3, 'Title (English) is required.')
      .max(180, 'Keep titles under 180 characters.'),
    titleAr: z
      .string()
      .trim()
      .min(3, 'Title (Arabic) is required.')
      .max(180, 'Keep titles under 180 characters.'),
    descriptionEn: z.string().max(4000).optional(),
    descriptionAr: z.string().max(4000).optional(),
    imageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
    isPublished: z.boolean(),
    // Booking fields
    maxTrackBookings: z.coerce.number().int().positive('Must be positive').nullable().optional(),
    trackBookingStart: z.string().optional().nullable(),
    trackBookingEnd: z.string().optional().nullable(),
    allowIndividualBooking: z.boolean(),
    singleBookingStart: z.string().optional().nullable(),
    singleBookingEnd: z.string().optional().nullable(),
    // Pricing — legacy single price (fallback when no ticket types are enabled)
    priceEgp: egpPriceSchema,
    // Per-ticket-type pricing (each enabled independently; empty price = free)
    onlineOnlyEnabled: z.boolean(),
    onlineOnlyPriceEgp: egpPriceSchema,
    onlineOfflineEnabled: z.boolean(),
    onlineOfflinePriceEgp: egpPriceSchema,
    offlineOnlyEnabled: z.boolean(),
    offlineOnlyPriceEgp: egpPriceSchema,
    // Location fields
    locationEn: z.string().trim().max(255).optional(),
    locationAr: z.string().trim().max(255).optional(),
    locationUrl: z
      .string()
      .url('Enter a valid URL')
      .max(500)
      .refine((value) => {
        try {
          return new URL(value).protocol === 'https:';
        } catch {
          return false;
        }
      }, 'Location URL must start with https://')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      // Track dates must be set together
      const trackDates = [data.trackBookingStart, data.trackBookingEnd].filter(Boolean);
      if (trackDates.length === 1) {
        return false;
      }
      return true;
    },
    {
      message: 'Track booking start and end must be set together.',
      path: ['trackBookingStart'],
    },
  )
  .refine(
    (data) => {
      // Individual dates must be set together when toggle is enabled
      if (data.allowIndividualBooking) {
        const individualDates = [data.singleBookingStart, data.singleBookingEnd].filter(Boolean);
        if (individualDates.length === 1) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Individual booking start and end must be set together.',
      path: ['singleBookingStart'],
    },
  )
  .refine(
    (data) => {
      if ((data.trackBookingStart || data.trackBookingEnd) && !data.maxTrackBookings) {
        return false;
      }
      return true;
    },
    {
      message: 'Max bookings is required when track booking period is set.',
      path: ['maxTrackBookings'],
    },
  );

export type TrackFormValues = z.infer<typeof trackFormSchema>;

// Map the form's per-ticket enable + EGP price into the API's nullable cents columns
// (disabled = null, enabled = cents incl. 0 for free).
export function mapTrackTicketPrices(values: TrackFormValues) {
  const toCents = (enabled: boolean, egp: string | undefined) =>
    enabled ? Math.round(Number(egp || 0) * 100) : null;
  return {
    onlineOnlyPriceCents: toCents(values.onlineOnlyEnabled, values.onlineOnlyPriceEgp),
    onlineOfflinePriceCents: toCents(values.onlineOfflineEnabled, values.onlineOfflinePriceEgp),
    offlineOnlyPriceCents: toCents(values.offlineOnlyEnabled, values.offlineOnlyPriceEgp),
  };
}

export function trackFormValuesToPayload(values: TrackFormValues): CreateTrackPayload {
  const toUtc = (value: string | null | undefined) => (value ? cairoLocalToUtcIso(value) : null);
  const sanitizeDescription = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? DOMPurify.sanitize(trimmed) : null;
  };

  return {
    titleEn: values.titleEn.trim(),
    titleAr: values.titleAr.trim(),
    descriptionEn: sanitizeDescription(values.descriptionEn),
    descriptionAr: sanitizeDescription(values.descriptionAr),
    imageUrl: values.imageUrl || null,
    isPublished: values.isPublished,
    maxTrackBookings: values.maxTrackBookings ?? null,
    trackBookingStart: toUtc(values.trackBookingStart),
    trackBookingEnd: toUtc(values.trackBookingEnd),
    singleBookingStart: toUtc(values.singleBookingStart),
    singleBookingEnd: toUtc(values.singleBookingEnd),
    allowIndividualBooking: values.allowIndividualBooking,
    priceInCents: values.priceEgp ? Math.round(Number(values.priceEgp) * 100) : null,
    locationEn: values.locationEn?.trim() || null,
    locationAr: values.locationAr?.trim() || null,
    locationUrl: values.locationUrl?.trim() || null,
    ...mapTrackTicketPrices(values),
  };
}

const TICKET_TYPE_ROWS = [
  {
    enabledField: 'onlineOnlyEnabled',
    priceField: 'onlineOnlyPriceEgp',
    label: 'Online Only',
    description: 'Online sessions live + recordings of all sessions.',
  },
  {
    enabledField: 'onlineOfflineEnabled',
    priceField: 'onlineOfflinePriceEgp',
    label: 'Online + Offline',
    description: 'Online sessions live + the offline day in person + all recordings.',
  },
  {
    enabledField: 'offlineOnlyEnabled',
    priceField: 'offlineOnlyPriceEgp',
    label: 'Offline Only',
    description: 'Offline day in person + its recordings (no online sessions).',
  },
] as const satisfies ReadonlyArray<{
  enabledField: keyof TrackFormValues;
  priceField: keyof TrackFormValues;
  label: string;
  description: string;
}>;

interface TrackFormProps {
  track?: Track;
  onSubmit: (payload: CreateTrackPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function TrackForm({ track, onSubmit, onCancel, isLoading = false }: TrackFormProps) {
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(() => track?.expert_ids ?? []);

  useEffect(() => {
    setSelectedExpertIds(track?.expert_ids ?? []);
  }, [track?.id, track?.expert_ids]);

  // Prefill datetime-local inputs from stored UTC, shown in Cairo wall-clock (empty stays empty).
  const prefillCairo = (date: Date | string | null | undefined): string =>
    date ? toCairoDatetimeLocal(date) : '';

  const form = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      titleEn: track?.titleEn ?? track?.title ?? '',
      titleAr: track?.titleAr ?? track?.title ?? '',
      descriptionEn: track?.descriptionEn ?? track?.description ?? '',
      descriptionAr: track?.descriptionAr ?? track?.description ?? '',
      imageUrl: track?.image_url || '',
      isPublished: track?.is_published ?? false, // Default to false - can't publish without events
      maxTrackBookings: track?.max_track_bookings ?? null,
      trackBookingStart: prefillCairo(track?.track_booking_start),
      trackBookingEnd: prefillCairo(track?.track_booking_end),
      allowIndividualBooking: track?.allow_individual_booking ?? false,
      singleBookingStart: prefillCairo(track?.single_booking_start),
      singleBookingEnd: prefillCairo(track?.single_booking_end),
      priceEgp: track?.price_in_cents ? String(track.price_in_cents / 100) : '',
      onlineOnlyEnabled: track?.online_only_price_cents != null,
      onlineOnlyPriceEgp:
        track?.online_only_price_cents != null ? String(track.online_only_price_cents / 100) : '',
      onlineOfflineEnabled: track?.online_offline_price_cents != null,
      onlineOfflinePriceEgp:
        track?.online_offline_price_cents != null
          ? String(track.online_offline_price_cents / 100)
          : '',
      offlineOnlyEnabled: track?.offline_only_price_cents != null,
      offlineOnlyPriceEgp:
        track?.offline_only_price_cents != null ? String(track.offline_only_price_cents / 100) : '',
      locationEn: track?.locationEn ?? track?.location ?? '',
      locationAr: track?.locationAr ?? track?.location ?? '',
      locationUrl: track?.location_url || '',
    },
  });

  const values = form.watch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const { url } = await uploadFile({ file, scope: 'events' });
      form.setValue('imageUrl', url, { shouldDirty: true, shouldTouch: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (formValues: TrackFormValues) => {
    await onSubmit({ ...trackFormValuesToPayload(formValues), expertIds: selectedExpertIds });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <BilingualTextField
          label="Track title"
          englishLabel="Title (English)"
          arabicLabel="Title (Arabic)"
          required
          valueEn={values.titleEn}
          valueAr={values.titleAr}
          onChangeEn={(value) => form.setValue('titleEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('titleAr', value, { shouldDirty: true })}
          englishPlaceholder="Content Marketing Masterclass"
          arabicPlaceholder="ماستركلاس تسويق المحتوى"
        />
        {(form.formState.errors.titleEn || form.formState.errors.titleAr) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.titleEn?.message ?? form.formState.errors.titleAr?.message}
          </p>
        )}

        <BilingualRichTextField
          label="Description"
          valueEn={values.descriptionEn ?? ''}
          valueAr={values.descriptionAr ?? ''}
          onChangeEn={(value) => form.setValue('descriptionEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('descriptionAr', value, { shouldDirty: true })}
        />

        <EventExpertPicker selectedExpertIds={selectedExpertIds} onChange={setSelectedExpertIds} />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input placeholder="https://example.com/image.jpg" {...field} />
                  <Button
                    type="button"
                    variant="outline"
                    className="whitespace-nowrap"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingImage ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Recommended size: 1200×640px. Max 20 MB. JPEG, PNG, or WebP.
              </FormDescription>
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priceEgp"
          render={({ field }) => {
            // When any ticket type is enabled the track is sold per-variant and this single price is
            // ignored (see resolveTrackBasePrice). Disable it so the two price concepts don't compete.
            const ticketPricingActive =
              form.watch('onlineOnlyEnabled') ||
              form.watch('onlineOfflineEnabled') ||
              form.watch('offlineOnlyEnabled');
            return (
              <FormItem>
                <FormLabel>Price (EGP)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0 for free"
                    inputMode="decimal"
                    {...field}
                    disabled={ticketPricingActive}
                  />
                </FormControl>
                <FormDescription>
                  {ticketPricingActive
                    ? 'Ignored while ticket types are enabled — each ticket below sets its own price. This single price applies only to tracks without ticket types.'
                    : 'Leave empty or set to 0 for free tracks. Used as the fallback when no ticket types below are enabled.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Ticket Types — optional per-variant pricing. Enabling any switches the track to ticket
            pricing (the legacy price above is ignored). Empty price = free. */}
        <div className="space-y-4 rounded-xl border bg-muted/30 p-6">
          <div>
            <h3 className="text-lg font-semibold">Ticket Types (optional)</h3>
            <p className="text-sm text-muted-foreground">
              Sell the track as Online Only / Online + Offline / Offline Only, each with its own
              price. Enable at least one to use ticket pricing; leave all off to keep the single
              price above.
            </p>
          </div>
          {TICKET_TYPE_ROWS.map((row) => (
            <div key={row.enabledField} className="rounded-lg border bg-background p-4">
              <FormField
                control={form.control}
                name={row.enabledField}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{row.label}</FormLabel>
                      <FormDescription>{row.description}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {form.watch(row.enabledField) && (
                <FormField
                  control={form.control}
                  name={row.priceField}
                  render={({ field }) => (
                    <FormItem className="mt-3 max-w-xs">
                      <FormLabel>Price (EGP)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0 for free"
                          inputMode="decimal"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <BilingualTextField
          label="Location"
          englishLabel="Location (English)"
          arabicLabel="Location (Arabic)"
          valueEn={values.locationEn ?? ''}
          valueAr={values.locationAr ?? ''}
          onChangeEn={(value) => form.setValue('locationEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('locationAr', value, { shouldDirty: true })}
          englishPlaceholder="Dubai, UAE or Online"
          arabicPlaceholder="دبي، الإمارات أو أونلاين"
        />
        <p className="text-sm text-muted-foreground">Where the track sessions will take place.</p>

        <FormField
          control={form.control}
          name="locationUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location URL (Map Link)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://maps.google.com/..."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Paste a link from any map service. Only visible to booked users.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Booking Configuration Section */}
        <div className="space-y-6 rounded-xl border bg-muted/30 p-6">
          <div>
            <h3 className="text-lg font-semibold">Booking Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure when members can book this track and individual events.
            </p>
          </div>

          <FormField
            control={form.control}
            name="maxTrackBookings"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Maximum Bookings</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      field.onChange(val);
                    }}
                  />
                </FormControl>
                <FormDescription>Total spots available for the entire track.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Track Booking Period */}
          <div className="space-y-4 rounded-lg border bg-background p-5">
            <div>
              <h4 className="font-medium">Track Booking Period</h4>
              <p className="text-xs text-muted-foreground">
                When members can book the entire track as a package.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="trackBookingStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opens</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="w-full"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trackBookingEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Closes</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="w-full"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Allow Individual Booking Toggle */}
          <FormField
            control={form.control}
            name="allowIndividualBooking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Allow Individual Event Booking</FormLabel>
                  <FormDescription>
                    When enabled, members can book individual events after track booking closes.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Single Event Booking Period - only shown when toggle is enabled */}
          {form.watch('allowIndividualBooking') && (
            <div className="space-y-4 rounded-lg border bg-background p-5">
              <div>
                <h4 className="font-medium">Individual Event Booking Period</h4>
                <p className="text-xs text-muted-foreground">
                  When members can book single events (after track booking closes).
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="singleBookingStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="w-full"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="singleBookingEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="w-full"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Published</FormLabel>
                <FormDescription>
                  {track
                    ? 'When enabled, members can see this track.'
                    : 'Save as draft first, add events, then publish.'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!track} // Can't publish on creation - need to add events first
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {track ? 'Save Changes' : 'Create Track'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleImageFileChange}
        />
      </form>
    </Form>
  );
}

export default TrackForm;
