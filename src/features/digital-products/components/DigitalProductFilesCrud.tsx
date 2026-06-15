import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  DIGITAL_PRODUCT_FILE_EXTENSIONS,
  DIGITAL_PRODUCT_FILE_TYPE_LABELS,
  type DigitalProductFile,
  type DigitalProductFileType,
} from '@/app/api/digitalProducts';
import { uploadFile } from '@/app/api/uploads';
import {
  useAddDigitalProductFile,
  useRemoveDigitalProductFile,
  useUpdateDigitalProductFile,
} from '@/features/digital-products/hooks/useDigitalProducts';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const fileItemSchema = z.object({
  fileType: z.enum(['excel', 'markdown', 'html', 'text', 'powerpoint']),
  displayName: z.string().min(1, 'Title is required').max(200),
});

type FileItemFormValues = z.infer<typeof fileItemSchema>;

type DigitalProductFilesCrudProps = {
  productId: string;
  files: DigitalProductFile[];
};

type PanelMode = 'list' | 'create' | 'edit';

function acceptForType(fileType: DigitalProductFileType): string {
  return DIGITAL_PRODUCT_FILE_EXTENSIONS[fileType].join(',');
}

function fileNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'file');
  } catch {
    return 'file';
  }
}

export function DigitalProductFilesCrud({ productId, files }: DigitalProductFilesCrudProps) {
  const [mode, setMode] = useState<PanelMode>('list');
  const [editingFile, setEditingFile] = useState<DigitalProductFile | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMutation = useAddDigitalProductFile(productId);
  const updateMutation = useUpdateDigitalProductFile(productId);
  const removeMutation = useRemoveDigitalProductFile(productId);

  const form = useForm<FileItemFormValues>({
    resolver: zodResolver(fileItemSchema),
    defaultValues: { fileType: 'excel', displayName: '' },
  });

  const fileType = form.watch('fileType');
  const isBusy = isUploading || addMutation.isPending || updateMutation.isPending;

  const resetPanel = () => {
    setMode('list');
    setEditingFile(null);
    setPendingFile(null);
    setFileError(null);
    form.reset({ fileType: 'excel', displayName: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    resetPanel();
    setMode('create');
  };

  const openEdit = (file: DigitalProductFile) => {
    setEditingFile(file);
    setPendingFile(null);
    form.reset({ fileType: file.fileType, displayName: file.displayName });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMode('edit');
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPendingFile(file);
    setFileError(null);
  };

  const handleSave = async (values: FileItemFormValues) => {
    if (mode === 'create') {
      if (!pendingFile) {
        setFileError('Upload a file for this item.');
        return;
      }

      setIsUploading(true);
      try {
        const uploaded = await uploadFile({ file: pendingFile, scope: 'digital-products' });
        await addMutation.mutateAsync({
          fileType: values.fileType,
          displayName: values.displayName.trim(),
          fileUrl: uploaded.url,
          sortOrder: files.length,
        });
        resetPanel();
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (mode === 'edit' && editingFile) {
      setIsUploading(true);
      try {
        const payload: Partial<{
          fileType: DigitalProductFileType;
          displayName: string;
          fileUrl: string;
        }> = {
          fileType: values.fileType,
          displayName: values.displayName.trim(),
        };

        if (pendingFile) {
          const uploaded = await uploadFile({ file: pendingFile, scope: 'digital-products' });
          payload.fileUrl = uploaded.url;
        }

        await updateMutation.mutateAsync({ fileId: editingFile.id, payload });
        resetPanel();
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Delete this file item?')) return;
    await removeMutation.mutateAsync(fileId);
    if (editingFile?.id === fileId) resetPanel();
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">Product files ({files.length})</h3>
          <p className="text-sm text-neutral-600">
            كل عنصر = نوع ملف + عنوان + ملف واحد. أضف عدة عناصر حسب الحاجة.
          </p>
        </div>
        {mode === 'list' && (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add file item
          </Button>
        )}
      </div>

      {mode === 'list' && (
        <>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No file items yet. Add at least one item to enable sales.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {files.map((file, index) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900">
                      <span className="mr-2 text-xs text-neutral-400">#{index + 1}</span>
                      {file.displayName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {DIGITAL_PRODUCT_FILE_TYPE_LABELS[file.fileType]} ·{' '}
                      {fileNameFromUrl(file.fileUrl)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(file)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={removeMutation.isPending}
                      onClick={() => void handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-lg border bg-neutral-50/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-medium text-neutral-900">
              {mode === 'create' ? 'New file item' : 'Edit file item'}
            </h4>
            <Button type="button" variant="ghost" size="icon" onClick={resetPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fileType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setPendingFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(DIGITAL_PRODUCT_FILE_TYPE_LABELS) as DigitalProductFileType[]).map(
                          (type) => (
                            <SelectItem key={type} value={type}>
                              {DIGITAL_PRODUCT_FILE_TYPE_LABELS[type]} (
                              {DIGITAL_PRODUCT_FILE_EXTENSIONS[type].join(', ')})
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Excel template — Week 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>{mode === 'create' ? 'File' : 'Replace file (optional)'}</FormLabel>
                {mode === 'edit' && editingFile && !pendingFile && (
                  <p className="mb-2 text-xs text-neutral-500">
                    Current: {fileNameFromUrl(editingFile.fileUrl)}
                  </p>
                )}
                {pendingFile && (
                  <p className="mb-2 text-xs text-[#29cf9f]">Selected: {pendingFile.name}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={acceptForType(fileType)}
                  onChange={handleFilePick}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {mode === 'create' ? 'Choose file' : 'Choose new file'}
                </Button>
                {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
              </FormItem>

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void form.handleSubmit(handleSave)()}
                >
                  {isBusy ? 'Saving...' : mode === 'create' ? 'Add item' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" disabled={isBusy} onClick={resetPanel}>
                  Cancel
                </Button>
              </div>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}
