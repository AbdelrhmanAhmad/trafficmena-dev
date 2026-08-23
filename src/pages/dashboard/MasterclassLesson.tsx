import { ArrowLeft, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { MASTERCLASS_FILE_TYPE_LABELS } from '@/app/api/masterclasses';
import {
  useMasterclassLessonContent,
  useMasterclassLessonProgress,
} from '@/features/masterclasses/hooks/useMasterclasses';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import VideoEmbed from '@/shared/components/VideoEmbed';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function MasterclassLessonContent() {
  const { lessonId = '' } = useParams();
  const { data, isLoading, isError } = useMasterclassLessonContent(lessonId);

  const masterclassId = data?.lesson.masterclass_id ?? '';
  const progressMutations = useMasterclassLessonProgress(masterclassId);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">This lesson is not available.</p>;

  const { lesson, videos, files } = data;
  const isCompleted = lesson.is_completed;
  const progressBusy = progressMutations.complete.isPending || progressMutations.uncomplete.isPending;

  const toggleComplete = async () => {
    if (isCompleted) {
      await progressMutations.uncomplete.mutateAsync(lessonId);
    } else {
      await progressMutations.complete.mutateAsync(lessonId);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to={`/dashboard/masterclasses/${lesson.masterclass_id}/learn`}
        className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to course
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-2 whitespace-pre-wrap text-neutral-600">{lesson.description}</p>
          )}
        </div>
        <Button
          type="button"
          variant={isCompleted ? 'outline' : 'default'}
          disabled={progressBusy}
          onClick={() => void toggleComplete()}
        >
          {progressBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {isCompleted ? 'Unmark complete' : 'Mark as complete'}
        </Button>
      </div>

      {videos.length > 0 && (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card key={video.id} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {video.video_url ? (
                  <VideoEmbed url={video.video_url} />
                ) : (
                  <p className="text-sm text-neutral-500">No video attached.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-xl border bg-white">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium text-neutral-900">{file.display_name}</p>
                    <p className="text-xs text-neutral-500">
                      {MASTERCLASS_FILE_TYPE_LABELS[file.file_type]}
                    </p>
                  </div>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MasterclassLessonPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <MasterclassLessonContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
