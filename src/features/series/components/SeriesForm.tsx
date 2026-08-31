import { zodResolver } from '@hookform/resolvers/zod';
import DOMPurify from 'dompurify';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import type { Series } from '../types';

const seriesFormSchema = z.object({
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
  isPremium: z.boolean(),
});

export type SeriesFormValues = z.infer<typeof seriesFormSchema>;

interface SeriesFormProps {
  series?: Series;
  onSubmit: (values: SeriesFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function SeriesForm({ series, onSubmit, onCancel, isLoading = false }: SeriesFormProps) {
  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      titleEn: series?.titleEn ?? series?.title ?? '',
      titleAr: series?.titleAr ?? series?.title ?? '',
      descriptionEn: series?.descriptionEn ?? series?.description ?? '',
      descriptionAr: series?.descriptionAr ?? series?.description ?? '',
      imageUrl: series?.image_url || '',
      isPublished: series?.is_published ?? true,
      isPremium: series?.is_premium ?? false,
    },
  });

  const values = form.watch();
  const [imagePreview, setImagePreview] = useState<string | null>(series?.image_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      form.setError('imageUrl', { message: 'Please select an image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      form.setError('imageUrl', { message: 'Image must be smaller than 5MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile({ file, scope: 'library' });
      form.setValue('imageUrl', result.url, { shouldValidate: true });
      setImagePreview(result.url);
    } catch (error) {
      form.setError('imageUrl', {
        message: error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (formValues: SeriesFormValues) => {
    const sanitizeDescription = (value: string | undefined) => {
      const trimmed = value?.trim();
      return trimmed ? DOMPurify.sanitize(trimmed) : undefined;
    };

    await onSubmit({
      ...formValues,
      descriptionEn: sanitizeDescription(formValues.descriptionEn),
      descriptionAr: sanitizeDescription(formValues.descriptionAr),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <BilingualTextField
          label="Series title"
          englishLabel="Title (English)"
          arabicLabel="Title (Arabic)"
          required
          valueEn={values.titleEn}
          valueAr={values.titleAr}
          onChangeEn={(value) => form.setValue('titleEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('titleAr', value, { shouldDirty: true })}
          englishPlaceholder="Enter series title"
          arabicPlaceholder="أدخل عنوان السلسلة"
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

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Input placeholder="https://..." {...field} className="flex-1" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {imagePreview && (
                    <div className="relative aspect-video max-w-xs overflow-hidden rounded-lg border">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={() => setImagePreview(null)}
                      />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>Add a thumbnail for the series.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Published</FormLabel>
                <FormDescription>Make this series visible to members.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPremium"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Premium Content</FormLabel>
                <FormDescription>Require an active subscription to access.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isUploading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : series ? (
              'Update Series'
            ) : (
              'Create Series'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default SeriesForm;
