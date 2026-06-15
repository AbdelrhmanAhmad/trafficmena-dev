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
import type { Series } from '../types';

const seriesFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(180),
  description: z.string().max(4000).optional(),
  imageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  isPublished: z.boolean(),
  isPremium: z.boolean(),
  priceEgp: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
      'Price must be between 0 and 100,000 EGP.',
    ),
  salesEnabled: z.boolean(),
});

type SeriesFormValues = z.infer<typeof seriesFormSchema>;

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
      title: series?.title || '',
      description: series?.description || '',
      imageUrl: series?.image_url || '',
      isPublished: series?.is_published ?? true,
      isPremium: series?.is_premium ?? false,
      priceEgp: series?.price_in_cents ? String(series.price_in_cents / 100) : '',
      salesEnabled: series?.sales_enabled ?? false,
    },
  });

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

  const handleSubmit = async (values: SeriesFormValues) => {
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
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter series title" {...field} />
              </FormControl>
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
                    placeholder="Describe what this series covers..."
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
                Set the series price. Leave empty or 0 for a free series.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="salesEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Sales Enabled</FormLabel>
                <FormDescription>
                  Available for sale when enabled, priced, published, and at least one recording is
                  attached. Purchase grants recordings only (not live track booking).
                </FormDescription>
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
