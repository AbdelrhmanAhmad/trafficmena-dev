import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Loader2, Pencil, Plus, Trash2, Video, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { MasterclassLessonVideo } from '@/app/api/masterclasses';
import { useMasterclassCurriculumMutations } from '@/features/masterclasses/hooks/useMasterclasses';
import VideoEmbed from '@/shared/components/VideoEmbed';
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
import { getVideoThumbnailUrl } from '@/shared/utils/videoThumbnail';

const videoItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  videoUrl: z.string().trim().min(1, 'Video URL is required').max(1000),
});

type VideoItemFormValues = z.infer<typeof videoItemSchema>;

type MasterclassLessonVideosCrudProps = {
  masterclassId: string;
  moduleId: string;
  lessonId: string;
  videos: MasterclassLessonVideo[];
  canDelete?: boolean;
};

type PanelMode = 'list' | 'create' | 'edit';

export function MasterclassLessonVideosCrud({
  masterclassId,
  moduleId,
  lessonId,
  videos,
  canDelete = false,
}: MasterclassLessonVideosCrudProps) {
  const [mode, setMode] = useState<PanelMode>('list');
  const [editingVideo, setEditingVideo] = useState<MasterclassLessonVideo | null>(null);

  const mutations = useMasterclassCurriculumMutations(masterclassId);

  const form = useForm<VideoItemFormValues>({
    resolver: zodResolver(videoItemSchema),
    defaultValues: { title: '', videoUrl: '' },
  });

  const isBusy = mutations.addVideo.isPending || mutations.updateVideo.isPending;

  const resetPanel = () => {
    setMode('list');
    setEditingVideo(null);
    form.reset({ title: '', videoUrl: '' });
  };

  const openCreate = () => {
    resetPanel();
    setMode('create');
  };

  const openEdit = (video: MasterclassLessonVideo) => {
    setEditingVideo(video);
    form.reset({ title: video.title, videoUrl: video.videoUrl });
    setMode('edit');
  };

  const handleSave = async (values: VideoItemFormValues) => {
    if (mode === 'create') {
      await mutations.addVideo.mutateAsync({
        moduleId,
        lessonId,
        payload: {
          title: values.title.trim(),
          videoUrl: values.videoUrl.trim(),
        },
      });
      resetPanel();
      return;
    }

    if (mode === 'edit' && editingVideo) {
      await mutations.updateVideo.mutateAsync({
        moduleId,
        lessonId,
        videoId: editingVideo.id,
        payload: {
          title: values.title.trim(),
          videoUrl: values.videoUrl.trim(),
        },
      });
      resetPanel();
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('Delete this video URL?')) return;
    await mutations.removeVideo.mutateAsync({ moduleId, lessonId, videoId });
    if (editingVideo?.id === videoId) resetPanel();
  };

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">Video URLs ({videos.length})</h3>
          <p className="text-sm text-neutral-600">
            Paste YouTube, Bunny CDN, or other embed links. Shown to enrolled members.
          </p>
        </div>
        {mode === 'list' && (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add video URL
          </Button>
        )}
      </div>

      {mode === 'list' && (
        <>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No video URLs yet. Add one if needed.</p>
          ) : (
            <ul className="space-y-4">
              {videos.map((video, index) => {
                const thumbnailUrl = getVideoThumbnailUrl(video.videoUrl);
                return (
                  <li key={video.id} className="rounded-lg border bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900">
                          <span className="mr-2 text-xs text-neutral-400">#{index + 1}</span>
                          {video.title}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{video.videoUrl}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" asChild>
                          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(video)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!canDelete || mutations.removeVideo.isPending}
                          onClick={() => void handleDelete(video.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      {/* {thumbnailUrl ? (
                        <div className="mb-3 overflow-hidden rounded-lg border">
                          <img
                            src={thumbnailUrl}
                            alt={video.title}
                            className="aspect-video w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                          <Video className="h-8 w-8" />
                        </div>
                      )} */}
                      <VideoEmbed url={video.videoUrl} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-lg border bg-neutral-50/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-medium text-neutral-900">
              {mode === 'create' ? 'New video URL' : 'Edit video URL'}
            </h4>
            <Button type="button" variant="ghost" size="icon" onClick={resetPanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Introduction" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtu.be/..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Paste the primary video link (YouTube, Bunny CDN, Vimeo, etc.).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void form.handleSubmit(handleSave)()}
                >
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === 'create' ? 'Add video' : 'Save changes'}
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
