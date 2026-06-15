import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { CalendarDays, MapPin, Upload, Users } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateEventPayload, EventDetailRecord } from '@/app/api/events';
import { uploadFile } from '@/app/api/uploads';
import { LazyEditor } from '@/shared/components/LazyEditor';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { CAIRO_TZ, getCairoOffsetString, toCairoDatetimeLocal } from '@/shared/utils/dateUtils';

const eventFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title is required.')
    .max(180, 'Keep titles under 180 characters.'),
  description: z
    .string()
    .trim()
    .min(1, 'Add a short description to help members understand the event.')
    .max(8000, 'Descriptions are limited to 8,000 characters.'),
  date: z.string().min(1, 'Pick a date and time.'),
  eventType: z.enum(['Event', 'Meetup', 'Mastermind', 'Retreat']),
  location: z.string().trim().max(255).optional(),
  locationUrl: z
    .string()
    .url()
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
  meetingLink: z
    .string()
    .url('Enter a valid URL')
    .max(500)
    .refine((value) => {
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Meeting link must start with https://')
    .optional()
    .or(z.literal('')),
  maxAttendees: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        (!Number.isNaN(Number(value)) &&
          Number(value) > 0 &&
          Number(value) <= 10000 &&
          Number.isInteger(Number(value))),
      'Capacity must be a whole number between 1 and 10,000.',
    ),
  imageUrl: z.string().trim().max(500).optional(),
  tags: z.string().optional(),
  priceEgp: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
      'Price must be between 0 and 100,000 EGP.',
    ),
});

export type AdminEventFormValues = z.infer<typeof eventFormSchema>;

type TrackInfo = {
  title: string;
  maxTrackBookings: number | null;
};

type AdminEventFormProps = {
  event?: EventDetailRecord;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  canDelete?: boolean;
  trackInfo?: TrackInfo;
};

type SanitizedHtmlProps = {
  className?: string;
  html: string;
};

const SanitizedPreviewDescription = ({ className, html }: SanitizedHtmlProps) => (
  <div
    className={className}
    // biome-ignore lint/security/noDangerouslySetInnerHtml: preview content is sanitized with DOMPurify
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

function formatPreviewDate(iso: string | undefined) {
  if (!iso) return 'TBC';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function AdminEventForm({
  event,
  onSubmit,
  submitLabel = 'Save event',
  isSubmitting,
  onDelete,
  isDeleting,
  canDelete = true,
  trackInfo,
}: AdminEventFormProps) {
  // Auto-set capacity from track if creating event for a track
  const defaultCapacity = event?.max_attendees
    ? String(event.max_attendees)
    : trackInfo?.maxTrackBookings
      ? String(trackInfo.maxTrackBookings)
      : '';

  const defaultValues: AdminEventFormValues = {
    title: event?.title ?? '',
    description: (event?.description ?? '').trim(),
    date: toCairoDatetimeLocal(event?.date),
    eventType: event?.event_type ?? 'Event',
    location: event?.location ?? '',
    locationUrl: event?.location_url ?? '',
    meetingLink: event?.meeting_link ?? '',
    maxAttendees: defaultCapacity,
    imageUrl: event?.image_url ?? '',
    tags: event?.tags?.length ? event.tags.join(', ') : '',
    priceEgp: event?.price_in_cents ? String(event.price_in_cents / 100) : '',
  };

  const form = useForm<AdminEventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const values = form.watch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewTags = values.tags
    ?.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);

  const previewDate = values.date ? new Date(values.date) : null;
  const previewDateIso = previewDate ? previewDate.toISOString() : undefined;
  const previewTitle = values.title || 'Event title';
  const previewLocation = values.location || 'Location TBC';
  const previewCapacity = values.maxAttendees;
  const previewType = values.eventType;
  const previewDescription =
    values.description || 'Add an engaging summary so members know what to expect.';
  const sanitizedPreviewDescription = DOMPurify.sanitize(previewDescription);
  const previewImageUrl = values.imageUrl?.trim() ? values.imageUrl.trim() : '';
  const preview = {
    title: previewTitle,
    date: previewDateIso,
    location: previewLocation,
    capacity: previewCapacity,
    tags: previewTags ?? [],
    type: previewType,
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const { url } = await uploadFile({ file, scope: 'events' });
      form.setValue('imageUrl', url, { shouldDirty: true, shouldTouch: true });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (formValues: AdminEventFormValues) => {
    const payload: CreateEventPayload = {
      title: formValues.title.trim(),
      description: DOMPurify.sanitize(formValues.description.trim()),
      date: new Date(`${formValues.date}${getCairoOffsetString()}`).toISOString(),
      eventType: formValues.eventType,
      location: formValues.location?.trim() ? formValues.location.trim() : null,
      locationUrl: formValues.locationUrl?.trim() ? formValues.locationUrl.trim() : null,
      meetingLink: formValues.meetingLink?.trim() ? formValues.meetingLink.trim() : null,
      maxAttendees: formValues.maxAttendees ? Number(formValues.maxAttendees) : null,
      imageUrl: formValues.imageUrl?.trim() ? formValues.imageUrl.trim() : null,
      tags: formValues.tags
        ? formValues.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => tag.toLowerCase())
            .slice(0, 12)
        : undefined,
      priceInCents: formValues.priceEgp ? Math.round(Number(formValues.priceEgp) * 100) : null,
    };

    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
          <Card>
            <CardHeader>
              <CardTitle>Create or edit an event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event title</FormLabel>
                    <FormControl>
                      <Input placeholder="Growth Workshop: MENA Edition" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Meetup">Meetup</SelectItem>
                        <SelectItem value="Mastermind">Mastermind</SelectItem>
                        <SelectItem value="Retreat">Retreat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Dubai, UAE or Online" {...field} />
                      </FormControl>
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
                        Paste a link from Google Maps, Apple Maps, or Waze
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting link (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://zoom.us/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Capacity {trackInfo?.maxTrackBookings ? '(required)' : '(optional)'}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="50" inputMode="numeric" {...field} />
                      </FormControl>
                      {trackInfo?.maxTrackBookings ? (
                        <FormDescription>
                          Minimum {trackInfo.maxTrackBookings} (track requirement)
                        </FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover image</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="https://cdn.example.com/event-cover.jpg" {...field} />
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
                      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                      <FormDescription>JPEG, PNG, WebP, or AVIF up to 20&nbsp;MB.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
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
                      Leave empty or set to 0 for free events. Subscribers get discounts on paid
                      events.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topics (comma separated)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="growth marketing, performance, mena"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field: _field }) => (
                  <FormItem>
                    <FormLabel>Event description</FormLabel>
                    <FormControl>
                      <Controller
                        control={form.control}
                        name="description"
                        render={({ field: editorField }) => (
                          <LazyEditor value={editorField.value} onChange={editorField.onChange} />
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Member preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt="Event cover"
                    className="w-full rounded-lg object-cover shadow-sm"
                  />
                ) : null}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">{preview.title}</h3>
                  <SanitizedPreviewDescription
                    className="prose prose-base max-w-none text-muted-foreground prose-headings:text-primary prose-strong:text-primary prose-a:text-primary-green"
                    html={sanitizedPreviewDescription}
                  />
                </div>

                <div className="space-y-3 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatPreviewDate(preview.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{preview.location}</span>
                  </div>
                  {preview.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Capacity {preview.capacity}</span>
                    </div>
                  )}
                </div>

                {preview.tags && preview.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {preview.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <Badge variant="secondary">{preview.type}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : submitLabel}
              </Button>
              {onDelete && canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (onDelete) await onDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete event'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
