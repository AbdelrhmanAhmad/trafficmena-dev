import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { CalendarDays, MapPin, Upload, Users } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateEventPayload, EventDetailRecord } from '@/app/api/events';
import { uploadFile } from '@/app/api/uploads';
import { SimpleEditorWrapper } from '@/shared/components/SimpleEditorWrapper';
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
  meetingLink: z.string().trim().max(500).optional(),
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
});

export type AdminEventFormValues = z.infer<typeof eventFormSchema>;

type AdminEventFormProps = {
  event?: EventDetailRecord;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  canDelete?: boolean;
};

function toDateTimeLocalString(input: string | Date | undefined) {
  const date = input ? new Date(input) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

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
}: AdminEventFormProps) {
  const defaultValues: AdminEventFormValues = {
    title: event?.title ?? '',
    description: (event?.description ?? '').trim(),
    date: toDateTimeLocalString(event?.date),
    eventType: event?.event_type ?? 'Event',
    location: event?.location ?? '',
    meetingLink: event?.meeting_link ?? '',
    maxAttendees: event?.max_attendees ? String(event.max_attendees) : '',
    imageUrl: event?.image_url ?? '',
    tags: event?.tags?.length ? event.tags.join(', ') : '',
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
      date: new Date(formValues.date).toISOString(),
      eventType: formValues.eventType,
      location: formValues.location?.trim() ? formValues.location.trim() : null,
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="50" inputMode="numeric" {...field} />
                      </FormControl>
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
                          <SimpleEditorWrapper
                            value={editorField.value}
                            onChange={editorField.onChange}
                          />
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
