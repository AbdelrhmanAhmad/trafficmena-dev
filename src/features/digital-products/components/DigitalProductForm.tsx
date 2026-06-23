import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  DigitalProductAdmin,
  DigitalProductFile,
  DigitalProductVideo,
} from '@/app/api/digitalProducts';
import { uploadFile } from '@/app/api/uploads';
import { DigitalProductFilesCrud } from '@/features/digital-products/components/DigitalProductFilesCrud';
import { DigitalProductVideosCrud } from '@/features/digital-products/components/DigitalProductVideosCrud';
import { LazyEditor } from '@/shared/components/LazyEditor';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';

const productFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(8000).optional(),
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
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type DigitalProductFormValues = z.infer<typeof productFormSchema>;

type DigitalProductFormProps = {
  product?: DigitalProductAdmin;
  files?: DigitalProductFile[];
  videos?: DigitalProductVideo[];
  onSubmit: (values: DigitalProductFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  canDeleteFiles?: boolean;
};

export function DigitalProductForm({
  product,
  files = [],
  videos = [],
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
      sortOrder: product?.sortOrder ?? 0,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
            render={() => (
              <FormItem>
                <FormLabel>Description</FormLabel>
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
                <p className="text-sm text-muted-foreground">One-time purchase price.</p>
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
                    <p className="text-sm text-muted-foreground">
                      Allow users to purchase this product.
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Show in the digital products store.
                    </p>
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
          <>
            <DigitalProductVideosCrud
              productId={product.id}
              videos={videos}
              canDelete={canDeleteFiles}
            />
            <DigitalProductFilesCrud
              productId={product.id}
              files={files}
              canDelete={canDeleteFiles}
            />
          </>
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
    sortOrder: values.sortOrder,
  };
}
