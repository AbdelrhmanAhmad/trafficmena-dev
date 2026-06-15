import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DigitalProductAdmin, DigitalProductFile } from '@/app/api/digitalProducts';
import { uploadFile } from '@/app/api/uploads';
import { useLibraryList } from '@/app/hooks/useLibraryAssets';
import { DigitalProductFilesCrud } from '@/features/digital-products/components/DigitalProductFilesCrud';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';

const productFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  priceEgp: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000),
      'Price must be between 0 and 100,000 EGP.',
    ),
  salesEnabled: z.boolean(),
  isPublished: z.boolean(),
  videoAssetId: z.string().uuid().or(z.literal('')).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type DigitalProductFormValues = z.infer<typeof productFormSchema>;

type DigitalProductFormProps = {
  product?: DigitalProductAdmin;
  files?: DigitalProductFile[];
  onSubmit: (values: DigitalProductFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  canDeleteFiles?: boolean;
};

export function DigitalProductForm({
  product,
  files = [],
  onSubmit,
  onCancel,
  isLoading = false,
  canDeleteFiles = false,
}: DigitalProductFormProps) {
  const form = useForm<DigitalProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title ?? '',
      description: product?.description ?? '',
      imageUrl: product?.imageUrl ?? '',
      priceEgp: product?.priceInCents ? String(product.priceInCents / 100) : '',
      salesEnabled: product?.salesEnabled ?? false,
      isPublished: product?.isPublished ?? true,
      videoAssetId: product?.videoAssetId ?? '',
      sortOrder: product?.sortOrder ?? 0,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: libraryData } = useLibraryList(1, 50, { type: 'Video' });
  const videoOptions = libraryData?.items ?? [];

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await uploadFile({ file, scope: 'general' });
      form.setValue('imageUrl', result.url);
      setImagePreview(result.url);
    } catch (error) {
      form.setError('imageUrl', {
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <form
          id="digital-product-details-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Product title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Product description" {...field} />
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
                <div className="space-y-3">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 w-full max-w-sm rounded-lg object-cover"
                    />
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageChange(e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload image
                  </Button>
                  <Input type="hidden" {...field} />
                </div>
              </FormControl>
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
                <Input type="number" min={0} step="0.01" placeholder="0" {...field} />
              </FormControl>
              <FormDescription>One-time purchase price.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="salesEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel>Sales enabled</FormLabel>
                  <FormDescription>Allow users to purchase this product.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel>Published</FormLabel>
                  <FormDescription>Show in the digital products store.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="videoAssetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional tutorial video</FormLabel>
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a library video" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No video</SelectItem>
                  {videoOptions.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Uses an existing library video (not uploaded here). Shown after purchase.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort order</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        </form>

        {product?.id && (
          <DigitalProductFilesCrud
            productId={product.id}
            files={files}
            canDelete={canDeleteFiles}
          />
        )}

        <div className="flex gap-3">
          <Button type="submit" form="digital-product-details-form" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save product
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Form>
  );
}

export function digitalProductFormValuesToPayload(values: DigitalProductFormValues) {
  const priceInCents =
    values.priceEgp && values.priceEgp.trim() !== ''
      ? Math.round(Number(values.priceEgp) * 100)
      : null;

  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    priceInCents,
    salesEnabled: values.salesEnabled,
    isPublished: values.isPublished,
    videoAssetId: values.videoAssetId?.trim() || null,
    sortOrder: values.sortOrder,
  };
}
