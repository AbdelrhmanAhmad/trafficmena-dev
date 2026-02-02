import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { uploadFile } from '@/app/api/uploads';
import { LazyEditor } from '@/shared/components/LazyEditor';
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
import type { Track } from '../types';

const trackFormSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(180),
    description: z.string().max(4000).optional(),
    imageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
    isPublished: z.boolean(),
    // Booking fields
    maxTrackBookings: z.coerce.number().int().positive('Must be positive').nullable().optional(),
    trackBookingStart: z.string().optional().nullable(),
    trackBookingEnd: z.string().optional().nullable(),
    allowIndividualBooking: z.boolean(),
    singleBookingStart: z.string().optional().nullable(),
    singleBookingEnd: z.string().optional().nullable(),
    // Pricing
    priceEgp: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
        'Price must be between 0 and 100,000 EGP.',
      ),
    // Location fields
    location: z.string().trim().max(255).optional(),
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

type TrackFormValues = z.infer<typeof trackFormSchema>;

interface TrackFormProps {
  track?: Track;
  onSubmit: (values: TrackFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function TrackForm({ track, onSubmit, onCancel, isLoading = false }: TrackFormProps) {
  // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    // Format as local time, not UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const form = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      title: track?.title || '',
      description: track?.description || '',
      imageUrl: track?.image_url || '',
      isPublished: track?.is_published ?? false, // Default to false - can't publish without events
      maxTrackBookings: track?.max_track_bookings ?? null,
      trackBookingStart: formatDateForInput(track?.track_booking_start),
      trackBookingEnd: formatDateForInput(track?.track_booking_end),
      allowIndividualBooking: track?.allow_individual_booking ?? false,
      singleBookingStart: formatDateForInput(track?.single_booking_start),
      singleBookingEnd: formatDateForInput(track?.single_booking_end),
      priceEgp: track?.price_in_cents ? String(track.price_in_cents / 100) : '',
      location: track?.location || '',
      locationUrl: track?.location_url || '',
    },
  });

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

  const handleSubmit = async (values: TrackFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Track Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Content Marketing Masterclass" {...field} />
              </FormControl>
              <FormDescription>The name members will see in the library.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={() => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <Controller
                control={form.control}
                name="description"
                render={({ field: editorField }) => (
                  <LazyEditor
                    value={editorField.value ?? ''}
                    onChange={editorField.onChange}
                    placeholder="Describe what members will learn in this track..."
                    maxLength={4000}
                  />
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />

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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (EGP)</FormLabel>
              <FormControl>
                <Input placeholder="0 for free" inputMode="decimal" {...field} />
              </FormControl>
              <FormDescription>
                Leave empty or set to 0 for free tracks. Subscribers get discounts on paid tracks.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Dubai, UAE or Online" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>Where the track sessions will take place.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
