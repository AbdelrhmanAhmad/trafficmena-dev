import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { FileText, Globe, HelpCircle, Link2, Lock, Upload, Video } from 'lucide-react';
import { type ChangeEvent, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  CreateLibraryAssetPayload,
  LibraryAssetRecord,
  UpdateLibraryAssetPayload,
} from '@/app/api/library';
import { uploadFile } from '@/app/api/uploads';
import { useEvents } from '@/features/events/hooks/useEvents';
import { LazyEditor } from '@/shared/components/LazyEditor';
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
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

const libraryAssetFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a descriptive title.').max(200),
    description: z.string().trim().max(8000).optional(),
    fileType: z.enum(['Video', 'Document', 'Presentation']),
    videoUrl: z.string().trim().max(1000).optional(),
    documentUrl: z.string().trim().max(1000).optional(),
    embedUrl: z.string().trim().max(1000).optional(),
    embedType: z.string().trim().max(120).optional(),
    thumbnailUrl: z.string().trim().max(1000).optional(),
    eventId: z.string().trim().uuid().optional(),
    isPublic: z.boolean().optional(),
    isPremium: z.boolean().optional(),
    fileSizeBytes: z
      .number({ invalid_type_error: 'Provide a valid file size.' })
      .int()
      .min(0, 'File size cannot be negative.')
      .max(20 * 1024 * 1024, 'Files must be 20 MB or smaller.')
      .nullable()
      .optional(),
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
  canDelete?: boolean;
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
  canDelete = true,
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
    thumbnailUrl: asset?.thumbnail_url ?? '',
    eventId: asset?.event_id ?? undefined,
    isPublic: asset?.is_public ?? false,
    isPremium: asset?.is_premium ?? false,
    fileSizeBytes: asset?.file_size_bytes ?? null,
  };

  const form = useForm<LibraryAssetFormValues>({
    resolver: zodResolver(libraryAssetFormSchema),
    defaultValues,
  });

  const { data: eventsData } = useEvents(1, 50);

  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null);
  const isPublicSwitchId = useId();
  const isPremiumSwitchId = useId();

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);

  const linkedEventTitle = useMemo(() => {
    if (!asset?.event_id) return null;
    const match = eventsData?.items.find((event) => event.id === asset.event_id);
    return match?.title ?? null;
  }, [asset?.event_id, eventsData?.items]);

  const primaryType = form.watch('fileType');
  const currentFileSize = form.watch('fileSizeBytes');

  const formatFileSize = (bytes: number | null | undefined) => {
    if (bytes == null) return null;
    if (bytes === 0) return '0 bytes';
    const units = ['bytes', 'KB', 'MB'];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const handleDocumentFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocumentUploadError(null);
    setIsUploadingDocument(true);

    try {
      const result = await uploadFile({ file, scope: 'library' });
      form.setValue('documentUrl', result.url, { shouldDirty: true, shouldTouch: true });
      form.setValue('fileSizeBytes', result.sizeBytes ?? null, {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch (error) {
      setDocumentUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploadingDocument(false);
      event.target.value = '';
    }
  };

  const handleThumbnailFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setThumbnailUploadError(null);
    setIsUploadingThumbnail(true);

    try {
      const { url } = await uploadFile({ file, scope: 'library' });
      form.setValue('thumbnailUrl', url, { shouldDirty: true, shouldTouch: true });
    } catch (error) {
      setThumbnailUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploadingThumbnail(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (values: LibraryAssetFormValues) => {
    const videoUrl = normaliseUrl(values.videoUrl);
    const documentUrl = normaliseUrl(values.documentUrl);
    const embedUrl = normaliseUrl(values.embedUrl);
    const thumbnailUrl = normaliseUrl(values.thumbnailUrl);

    const sanitizedDescription = values.description?.trim()
      ? DOMPurify.sanitize(values.description.trim())
      : null;

    const payload: CreateLibraryAssetPayload = {
      title: values.title.trim(),
      description: sanitizedDescription,
      fileType: values.fileType,
      videoUrl,
      documentUrl,
      embedUrl,
      embedType: values.embedType?.trim() ? values.embedType.trim() : null,
      thumbnailUrl,
      eventId: values.eventId?.trim() ? values.eventId.trim() : null,
      isPublic: values.isPublic ?? false,
      isPremium: values.isPremium ?? false,
      fileSizeBytes: documentUrl ? (values.fileSizeBytes ?? null) : null,
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
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail Image</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="https://example.com/thumbnail.jpg" {...field} />
                      <Button
                        type="button"
                        variant="outline"
                        className="whitespace-nowrap"
                        disabled={isUploadingThumbnail}
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingThumbnail ? 'Uploading…' : 'Upload'}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Recommended size: 1200×640px. Max 20 MB. JPEG, PNG, or WebP.
                  </FormDescription>
                  {thumbnailUploadError && (
                    <p className="text-xs text-destructive">{thumbnailUploadError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <LazyEditor value={editorField.value ?? ''} onChange={editorField.onChange} />
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
                    <div className="flex gap-2">
                      <Input placeholder="https://cdn.example.com/document.pdf" {...field} />
                      <Button
                        type="button"
                        variant="outline"
                        className="whitespace-nowrap"
                        disabled={isUploadingDocument}
                        onClick={() => documentInputRef.current?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {isUploadingDocument ? 'Uploading…' : 'Upload'}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload PDFs or presentations up to 20&nbsp;MB, or paste an existing link.
                  </FormDescription>
                  {documentUploadError && (
                    <p className="text-xs text-destructive">{documentUploadError}</p>
                  )}
                  {formatFileSize(currentFileSize) && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded file size: {formatFileSize(currentFileSize)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
              className="hidden"
              onChange={handleDocumentFileUpload}
            />

            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={handleThumbnailFileUpload}
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

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-600" />
                      <Label htmlFor={isPublicSwitchId} className="font-medium">
                        Make publicly accessible
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              When enabled, all authenticated users can access this content, even if
                              they haven't registered for the associated event.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Switch
                        id={isPublicSwitchId}
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormDescription className="mt-2 text-xs">
                    {form.watch('eventId')
                      ? 'By default, only users registered for the linked event can access this content.'
                      : 'Content without a linked event is accessible to all users.'}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPremium"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <Label htmlFor={isPremiumSwitchId} className="font-medium">
                        Premium content
                      </Label>
                    </div>
                    <FormControl>
                      <Switch
                        id={isPremiumSwitchId}
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormDescription className="mt-2 text-xs">
                    Requires an active subscription to access this content.
                  </FormDescription>
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
              {onDelete && canDelete ? (
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
