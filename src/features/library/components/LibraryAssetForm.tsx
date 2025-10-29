import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Link2, Video } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  CreateLibraryAssetPayload,
  LibraryAssetRecord,
  UpdateLibraryAssetPayload,
} from '@/app/api/library';
import { useEvents } from '@/features/events/hooks/useEvents';
import { SimpleEditorWrapper } from '@/shared/components/SimpleEditorWrapper';
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

const libraryAssetFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a descriptive title.').max(200),
    description: z.string().trim().max(8000).optional(),
    fileType: z.enum(['Video', 'Document', 'Presentation']),
    videoUrl: z.string().trim().max(1000).optional(),
    documentUrl: z.string().trim().max(1000).optional(),
    embedUrl: z.string().trim().max(1000).optional(),
    embedType: z.string().trim().max(120).optional(),
    eventId: z.string().trim().uuid().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.fileType === 'Video' && !values.videoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['videoUrl'],
        message: 'Video URL is required.',
      });
    }
    if (values.fileType === 'Document' && !values.documentUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentUrl'],
        message: 'Document URL is required.',
      });
    }
    if (values.fileType === 'Presentation' && !values.embedUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['embedUrl'],
        message: 'Embed URL is required.',
      });
    }
  });

export type LibraryAssetFormValues = z.infer<typeof libraryAssetFormSchema>;

type LibraryAssetFormProps = {
  asset?: LibraryAssetRecord;
  onSubmit: (payload: CreateLibraryAssetPayload | UpdateLibraryAssetPayload) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
};

function normaliseUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function LibraryAssetForm({
  asset,
  onSubmit,
  submitLabel = 'Save asset',
  isSubmitting,
  onDelete,
  isDeleting,
}: LibraryAssetFormProps) {
  const defaultValues: LibraryAssetFormValues = {
    title: asset?.title ?? '',
    description: asset?.description ?? '',
    fileType: asset?.file_type ?? 'Video',
    videoUrl: asset?.video_url ?? (asset?.file_type === 'Video' ? (asset?.file_url ?? '') : ''),
    documentUrl:
      asset?.document_url ?? (asset?.file_type === 'Document' ? (asset?.file_url ?? '') : ''),
    embedUrl:
      asset?.embed_url ?? (asset?.file_type === 'Presentation' ? (asset?.file_url ?? '') : ''),
    embedType: asset?.embed_type ?? '',
    eventId: asset?.event_id ?? undefined,
  };

  const form = useForm<LibraryAssetFormValues>({
    resolver: zodResolver(libraryAssetFormSchema),
    defaultValues,
  });

  const { data: eventsData } = useEvents(1, 50);

  const linkedEventTitle = useMemo(() => {
    if (!asset?.event_id) return null;
    const match = eventsData?.items.find((event) => event.id === asset.event_id);
    return match?.title ?? null;
  }, [asset?.event_id, eventsData?.items]);

  const primaryType = form.watch('fileType');

  const handleSubmit = async (values: LibraryAssetFormValues) => {
    const payload: CreateLibraryAssetPayload = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      fileType: values.fileType,
      videoUrl: normaliseUrl(values.videoUrl),
      documentUrl: normaliseUrl(values.documentUrl),
      embedUrl: normaliseUrl(values.embedUrl),
      embedType: values.embedType?.trim() ? values.embedType.trim() : null,
      eventId: values.eventId?.trim() ? values.eventId.trim() : null,
    };

    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{asset ? 'Update library asset' : 'Create library asset'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Growth workshop replay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fileType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Video">Video</SelectItem>
                        <SelectItem value="Document">Document</SelectItem>
                        <SelectItem value="Presentation">Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sets the primary format. You can still attach additional files below.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field: editorField }) => (
                      <SimpleEditorWrapper
                        value={editorField.value ?? ''}
                        onChange={editorField.onChange}
                      />
                    )}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Video URL {primaryType === 'Video' ? '(required)' : '(optional)'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtu.be/..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Paste the primary video link. Required when asset type is set to Video, optional
                    otherwise.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Document URL {primaryType === 'Document' ? '(required)' : '(optional)'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://cdn.example.com/document.pdf" {...field} />
                  </FormControl>
                  <FormDescription>
                    Add a PDF or document download. Required when asset type is Document.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="embedUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Presentation Embed URL{' '}
                    {primaryType === 'Presentation' ? '(required)' : '(optional)'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://docs.google.com/presentation/..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Use an embeddable link (Google Slides, Canva, etc.). Required when asset type is
                    Presentation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="embedType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed provider (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="google_slides" {...field} />
                  </FormControl>
                  <FormDescription>
                    Helps the player render known providers (example: `google_slides`, `loom`).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked event (optional)</FormLabel>
                  <Select
                    value={field.value ?? '__NONE__'}
                    onValueChange={(value) => {
                      field.onChange(value === '__NONE__' ? undefined : value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__NONE__">No linked event</SelectItem>
                      {(eventsData?.items ?? []).map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {asset?.event_id && !eventsData?.items?.length && (
                    <p className="text-xs text-muted-foreground">
                      Currently linked to <strong>{linkedEventTitle ?? 'an archived event'}</strong>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review & publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span>{form.getValues('fileType')}</span>
              </div>
              {form.getValues('videoUrl') && (
                <div className="flex items-center gap-2 break-all">
                  <Link2 className="h-4 w-4" />
                  <span>{form.getValues('videoUrl')}</span>
                </div>
              )}
              {form.getValues('documentUrl') && (
                <div className="flex items-center gap-2 break-all">
                  <FileText className="h-4 w-4" />
                  <span>{form.getValues('documentUrl')}</span>
                </div>
              )}
              {form.getValues('embedUrl') && (
                <div className="flex items-center gap-2 break-all">
                  <Link2 className="h-4 w-4" />
                  <span>{form.getValues('embedUrl')}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : submitLabel}
              </Button>
              {onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (onDelete) await onDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete asset'}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
