import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MasterclassAdmin } from '@/app/api/masterclasses';
import { EventExpertPicker } from '@/features/experts/components/EventExpertPicker';
import { uploadFile } from '@/app/api/uploads';
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

const formSchema = z.object({
  titleEn: z
    .string()
    .trim()
    .min(1, 'Title (English) is required.')
    .max(200, 'Keep titles under 200 characters.'),
  titleAr: z
    .string()
    .trim()
    .min(1, 'Title (Arabic) is required.')
    .max(200, 'Keep titles under 200 characters.'),
  descriptionEn: z.string().max(5000).optional(),
  descriptionAr: z.string().max(5000).optional(),
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
  onSubmit: (payload: ReturnType<typeof masterclassFormValuesToPayload>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

export function MasterclassForm({
  masterclass,
  onSubmit,
  onCancel,
  isLoading = false,
}: MasterclassFormProps) {
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(
    () => masterclass?.expertIds ?? [],
  );

  useEffect(() => {
    setSelectedExpertIds(masterclass?.expertIds ?? []);
  }, [masterclass?.id, masterclass?.expertIds]);

  const form = useForm<MasterclassFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titleEn: masterclass?.titleEn ?? masterclass?.title ?? '',
      titleAr: masterclass?.titleAr ?? masterclass?.title ?? '',
      descriptionEn: masterclass?.descriptionEn ?? masterclass?.description ?? '',
      descriptionAr: masterclass?.descriptionAr ?? masterclass?.description ?? '',
      imageUrl: masterclass?.imageUrl ?? '',
      priceEgp: masterclass?.priceInCents ? String(masterclass.priceInCents / 100) : '',
      isPublished: masterclass?.isPublished ?? false,
      sortOrder: masterclass?.sortOrder ?? 0,
    },
  });

  const values = form.watch();
  const [imagePreview, setImagePreview] = useState<string | null>(masterclass?.imageUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!masterclass) return;
    form.reset({
      titleEn: masterclass.titleEn ?? masterclass.title,
      titleAr: masterclass.titleAr ?? masterclass.title,
      descriptionEn: masterclass.descriptionEn ?? masterclass.description ?? '',
      descriptionAr: masterclass.descriptionAr ?? masterclass.description ?? '',
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
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(masterclassFormValuesToPayload(values, selectedExpertIds));
        })}
        className="space-y-6"
      >
        <BilingualTextField
          label="Title"
          englishLabel="Title (English)"
          arabicLabel="Title (Arabic)"
          required
          valueEn={values.titleEn}
          valueAr={values.titleAr}
          onChangeEn={(value) => form.setValue('titleEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('titleAr', value, { shouldDirty: true })}
          englishPlaceholder="AI Marketing Masterclass"
          arabicPlaceholder="ماستركلاس تسويق الذكاء الاصطناعي"
        />
        {(form.formState.errors.titleEn || form.formState.errors.titleAr) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.titleEn?.message ?? form.formState.errors.titleAr?.message}
          </p>
        )}

        <BilingualTextField
          label="Description"
          englishLabel="Description (English)"
          arabicLabel="Description (Arabic)"
          multiline
          rows={4}
          valueEn={values.descriptionEn ?? ''}
          valueAr={values.descriptionAr ?? ''}
          onChangeEn={(value) => form.setValue('descriptionEn', value, { shouldDirty: true })}
          onChangeAr={(value) => form.setValue('descriptionAr', value, { shouldDirty: true })}
          englishPlaceholder="Course overview"
          arabicPlaceholder="نظرة عامة على الدورة"
        />

        <EventExpertPicker selectedExpertIds={selectedExpertIds} onChange={setSelectedExpertIds} />

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

export function masterclassFormValuesToPayload(
  values: MasterclassFormValues,
  expertIds?: string[],
) {
  const priceInCents =
    values.priceEgp && values.priceEgp.trim() !== ''
      ? Math.round(Number(values.priceEgp) * 100)
      : null;

  return {
    titleEn: values.titleEn.trim(),
    titleAr: values.titleAr.trim(),
    descriptionEn: values.descriptionEn?.trim() || null,
    descriptionAr: values.descriptionAr?.trim() || null,
    imageUrl: values.imageUrl?.trim() || null,
    priceInCents,
    isPublished: values.isPublished,
    sortOrder: values.sortOrder,
    expertIds,
  };
}
