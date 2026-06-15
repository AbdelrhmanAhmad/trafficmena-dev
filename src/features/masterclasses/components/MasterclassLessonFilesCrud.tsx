import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  MASTERCLASS_FILE_EXTENSIONS,
  MASTERCLASS_FILE_TYPE_LABELS,
  type MasterclassFileType,
  type MasterclassLessonFile,
} from '@/app/api/masterclasses';
import { uploadFile } from '@/app/api/uploads';
import { useMasterclassCurriculumMutations } from '@/features/masterclasses/hooks/useMasterclasses';
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
type PanelMode = 'list' | 'create' | 'edit';

type MasterclassLessonFilesCrudProps = {
  masterclassId: string;
  moduleId: string;
  lessonId: string;
  files: MasterclassLessonFile[];
};

function acceptForType(fileType: MasterclassFileType): string {
  return MASTERCLASS_FILE_EXTENSIONS[fileType].join(',');
}

function fileNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'file');
  } catch {
    return 'file';
  }
}

export function MasterclassLessonFilesCrud({
  masterclassId,
  moduleId,
  lessonId,
  files,
}: MasterclassLessonFilesCrudProps) {
  const mutations = useMasterclassCurriculumMutations(masterclassId);
  const [mode, setMode] = useState<PanelMode>('list');
  const [editingFile, setEditingFile] = useState<MasterclassLessonFile | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FileItemFormValues>({
    resolver: zodResolver(fileItemSchema),
    defaultValues: { fileType: 'excel', displayName: '' },
  });

  const fileType = form.watch('fileType');
  const isBusy =
    isUploading || mutations.addFile.isPending || mutations.updateFile.isPending;

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

  const openEdit = (file: MasterclassLessonFile) => {
    setEditingFile(file);
    setPendingFile(null);
    form.reset({ fileType: file.fileType, displayName: file.displayName });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMode('edit');
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    setPendingFile(e.target.files?.[0] ?? null);
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
        const uploaded = await uploadFile({ file: pendingFile, scope: 'masterclasses' });
        await mutations.addFile.mutateAsync({
          moduleId,
          lessonId,
          payload: {
            fileType: values.fileType,
            displayName: values.displayName.trim(),
            fileUrl: uploaded.url,
            sortOrder: files.length,
          },
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
          fileType: MasterclassFileType;
          displayName: string;
          fileUrl: string;
        }> = {
          fileType: values.fileType,
          displayName: values.displayName.trim(),
        };

        if (pendingFile) {
          const uploaded = await uploadFile({ file: pendingFile, scope: 'masterclasses' });
          payload.fileUrl = uploaded.url;
        }

        await mutations.updateFile.mutateAsync({
          moduleId,
          lessonId,
          fileId: editingFile.id,
          payload,
        });
        resetPanel();
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Delete this file item?')) return;
    await mutations.removeFile.mutateAsync({ moduleId, lessonId, fileId });
    if (editingFile?.id === fileId) resetPanel();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">Files ({files.length})</p>
        {mode === 'list' && (
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add file
          </Button>
        )}
      </div>

      {mode === 'list' && (
        <>
          {files.length === 0 ? (
            <p className="text-sm text-neutral-500">No files yet. Add one or more file items.</p>
          ) : (
            <ul className="divide-y rounded-md border bg-white">
              {files.map((file, index) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="mr-2 text-xs text-neutral-400">#{index + 1}</span>
                      {file.displayName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {MASTERCLASS_FILE_TYPE_LABELS[file.fileType]} · {fileNameFromUrl(file.fileUrl)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(file)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={mutations.removeFile.isPending}
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
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {mode === 'create' ? 'New file item' : 'Edit file item'}
            </h4>
            <Button type="button" variant="ghost" size="icon" onClick={resetPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Form {...form}>
            <div className="space-y-3">
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
                        {(Object.keys(MASTERCLASS_FILE_TYPE_LABELS) as MasterclassFileType[]).map(
                          (type) => (
                            <SelectItem key={type} value={type}>
                              {MASTERCLASS_FILE_TYPE_LABELS[type]}
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
                      <Input placeholder="e.g. Worksheet — Lesson 1" {...field} />
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
                  size="sm"
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
                  size="sm"
                  disabled={isBusy}
                  onClick={() => void form.handleSubmit(handleSave)()}
                >
                  {isBusy ? 'Saving...' : mode === 'create' ? 'Add item' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={resetPanel}>
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
