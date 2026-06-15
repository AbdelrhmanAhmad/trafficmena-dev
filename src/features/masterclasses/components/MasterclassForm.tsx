import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MasterclassAdmin } from '@/app/api/masterclasses';
import { uploadFile } from '@/app/api/uploads';
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
import { Textarea } from '@/shared/components/ui/textarea';

const formSchema = z.object({
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
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type MasterclassFormValues = z.infer<typeof formSchema>;

type MasterclassFormProps = {
  masterclass?: MasterclassAdmin;
  onSubmit: (values: MasterclassFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

export function MasterclassForm({
  masterclass,
  onSubmit,
  onCancel,
  isLoading = false,
}: MasterclassFormProps) {
  const form = useForm<MasterclassFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: masterclass?.title ?? '',
      description: masterclass?.description ?? '',
      imageUrl: masterclass?.imageUrl ?? '',
      priceEgp: masterclass?.priceInCents ? String(masterclass.priceInCents / 100) : '',
      isPublished: masterclass?.isPublished ?? false,
      sortOrder: masterclass?.sortOrder ?? 0,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(masterclass?.imageUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!masterclass) return;
    form.reset({
      title: masterclass.title,
      description: masterclass.description ?? '',
      imageUrl: masterclass.imageUrl ?? '',
      priceEgp: masterclass.priceInCents ? String(masterclass.priceInCents / 100) : '',
      isPublished: masterclass.isPublished,
      sortOrder: masterclass.sortOrder,
    });
    setImagePreview(masterclass.imageUrl ?? null);
  }, [masterclass, form]);

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="AI Marketing Masterclass" {...field} />
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
                <Textarea rows={4} placeholder="Course overview" {...field} />
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
              <FormDescription>One-time purchase — not added to cart.</FormDescription>
              <FormMessage />
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
                <FormDescription>Show in the masterclass catalog when priced and has lessons.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
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

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save masterclass
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function masterclassFormValuesToPayload(values: MasterclassFormValues) {
  const priceInCents =
    values.priceEgp && values.priceEgp.trim() !== ''
      ? Math.round(Number(values.priceEgp) * 100)
      : null;

  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    priceInCents,
    isPublished: values.isPublished,
    sortOrder: values.sortOrder,
  };
}
