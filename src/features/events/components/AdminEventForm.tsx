import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { CalendarDays, MapPin, Upload, Users } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateEventPayload, EventDetailRecord } from '@/app/api/events';
import { uploadFile } from '@/app/api/uploads';
import { BilingualRichTextField } from '@/shared/components/admin/BilingualRichTextField';
import { BilingualTextField } from '@/shared/components/admin/BilingualTextField';
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
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { ToastAction } from '@/shared/components/ui/toast';
import { useToast } from '@/shared/hooks/custom/use-toast';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';
import { CAIRO_TZ, cairoLocalToUtcIso, toCairoDatetimeLocal } from '@/shared/utils/dateUtils';

const eventFormSchema = z.object({
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
  descriptionEn: z
    .string()
    .trim()
    .min(1, 'Add an English description.')
    .max(8000, 'Descriptions are limited to 8,000 characters.'),
  descriptionAr: z
    .string()
    .trim()
    .min(1, 'Add an Arabic description.')
    .max(8000, 'Descriptions are limited to 8,000 characters.'),
  date: z.string().min(1, 'Pick a date and time.'),
  eventType: z.enum(['Event', 'Meetup', 'Mastermind', 'Retreat']),
  eventFormat: z.enum(['online', 'offline']),
  eventFormatOverrideReason: z.string().trim().max(500).optional(),
  locationEn: z.string().trim().max(255).optional(),
  locationAr: z.string().trim().max(255).optional(),
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
  isPublished: z.boolean(),
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
    // Base direction follows content's first strong char so mixed AR/EN keeps correct word order
    dir="auto"
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
    titleEn: event?.titleEn ?? event?.title ?? '',
    titleAr: event?.titleAr ?? event?.title ?? '',
    descriptionEn: (event?.descriptionEn ?? event?.description ?? '').trim(),
    descriptionAr: (event?.descriptionAr ?? event?.description ?? '').trim(),
    date: toCairoDatetimeLocal(event?.date),
    eventType: event?.event_type ?? 'Event',
    eventFormat: event?.event_format ?? 'offline',
    eventFormatOverrideReason: '',
    locationEn: event?.locationEn ?? event?.location ?? '',
    locationAr: event?.locationAr ?? event?.location ?? '',
    locationUrl: event?.location_url ?? '',
    meetingLink: event?.meeting_link ?? '',
    maxAttendees: defaultCapacity,
    imageUrl: event?.image_url ?? '',
    tags: event?.tags?.length ? event.tags.join(', ') : '',
    priceEgp: event?.price_in_cents ? String(event.price_in_cents / 100) : '',
    isPublished: event?.is_published ?? false,
  };

  const form = useForm<AdminEventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const { toast } = useToast();
  const isAdminOverrideAllowed = useRolePermissions().isAdmin;
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
  const previewTitle = values.titleEn || values.titleAr || 'Event title';
  const previewLocation = values.locationEn || values.locationAr || 'Location TBC';
  const previewCapacity = values.maxAttendees;
  const previewType = values.eventType;
  const previewDescription =
    values.descriptionEn ||
    values.descriptionAr ||
    'Add an engaging summary so members know what to expect.';
  const sanitizedPreviewDescription = DOMPurify.sanitize(previewDescription);
  const previewImageUrl = values.imageUrl?.trim() ? values.imageUrl.trim() : '';
  const eventFormatChanged = Boolean(event && values.eventFormat !== event.event_format);
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
    const formatOverrideReason = formValues.eventFormatOverrideReason?.trim() ?? '';

    const payload: CreateEventPayload = {
      titleEn: formValues.titleEn.trim(),
      titleAr: formValues.titleAr.trim(),
      descriptionEn: DOMPurify.sanitize(formValues.descriptionEn.trim()),
      descriptionAr: DOMPurify.sanitize(formValues.descriptionAr.trim()),
      date: cairoLocalToUtcIso(formValues.date),
      eventType: formValues.eventType,
      eventFormat: formValues.eventFormat,
      eventFormatOverrideReason:
        event && formValues.eventFormat !== event.event_format && formatOverrideReason
          ? formatOverrideReason
          : undefined,
      locationEn: formValues.locationEn?.trim() ? formValues.locationEn.trim() : null,
      locationAr: formValues.locationAr?.trim() ? formValues.locationAr.trim() : null,
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
      isPublished: formValues.isPublished,
    };

    await onSubmit(payload);

    // No-silent-draft safeguard (D-2): warn only when an event becomes newly hidden — a brand-new
    // draft or a published event flipped to draft — not on every re-save of an existing draft.
    const newlyHidden = !formValues.isPublished && event?.is_published !== false;
    if (newlyHidden) {
      toast({
        title: 'Saved as draft — not visible to members',
        description: "Members can't see or register for it until you publish.",
        // Edit keeps the user on the form, so offer a one-click publish (a safe in-place re-save).
        // Create navigates to the event page, so it gets the notice without an unsafe re-create.
        action: event ? (
          <ToastAction
            altText="Publish now"
            onClick={() => {
              void handlePublishNow();
            }}
          >
            Publish now
          </ToastAction>
        ) : undefined,
      });
    }
  };

  const handlePublishNow = async () => {
    const previousIsPublished = form.getValues('isPublished');
    const publishedValues = { ...form.getValues(), isPublished: true };
    form.setValue('isPublished', true, { shouldDirty: true, shouldTouch: true });

    try {
      await handleSubmit(publishedValues);
    } catch {
      form.setValue('isPublished', previousIsPublished, { shouldDirty: true, shouldTouch: true });
    }
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
              <BilingualTextField
                label="Event title"
                englishLabel="Title (English)"
                arabicLabel="Title (Arabic)"
                required
                valueEn={values.titleEn}
                valueAr={values.titleAr}
                onChangeEn={(value) => form.setValue('titleEn', value, { shouldDirty: true })}
                onChangeAr={(value) => form.setValue('titleAr', value, { shouldDirty: true })}
                englishPlaceholder="Growth Workshop: MENA Edition"
                arabicPlaceholder="ورشة النمو: نسخة الشرق الأوسط"
              />
              {(form.formState.errors.titleEn || form.formState.errors.titleAr) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.titleEn?.message ?? form.formState.errors.titleAr?.message}
                </p>
              )}

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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
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

                <FormField
                  control={form.control}
                  name="eventFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery mode</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="online">Online (Zoom / live stream)</SelectItem>
                          <SelectItem value="offline">Offline (in person)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Drives subscriber pricing and which sessions a ticket includes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {eventFormatChanged && isAdminOverrideAllowed && (
                <FormField
                  control={form.control}
                  name="eventFormatOverrideReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery mode change reason</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Required if this event is linked to sold ticketed tracks"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Stored in server logs with the affected track report when an override is
                        required.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <BilingualTextField
                label="Location (address)"
                englishLabel="Location (English)"
                arabicLabel="Location (Arabic)"
                valueEn={values.locationEn ?? ''}
                valueAr={values.locationAr ?? ''}
                onChangeEn={(value) => form.setValue('locationEn', value, { shouldDirty: true })}
                onChangeAr={(value) => form.setValue('locationAr', value, { shouldDirty: true })}
                englishPlaceholder="Dubai, UAE"
                arabicPlaceholder="دبي، الإمارات"
              />

              <div className="grid gap-4 md:grid-cols-1">
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

              <BilingualRichTextField
                label="Event description"
                required
                valueEn={values.descriptionEn}
                valueAr={values.descriptionAr}
                onChangeEn={(value) => form.setValue('descriptionEn', value, { shouldDirty: true })}
                onChangeAr={(value) => form.setValue('descriptionAr', value, { shouldDirty: true })}
              />
              {(form.formState.errors.descriptionEn || form.formState.errors.descriptionAr) && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.descriptionEn?.message ??
                    form.formState.errors.descriptionAr?.message}
                </p>
              )}

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Published</FormLabel>
                      <FormDescription>
                        {field.value
                          ? 'Visible to members in event listings.'
                          : 'Draft — saved but hidden from members until you publish.'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
