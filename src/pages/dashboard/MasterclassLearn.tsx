import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMasterclassLearn } from '@/features/masterclasses/hooks/useMasterclasses';
import { MasterclassCertificateCard } from '@/features/certificates/components/MasterclassCertificateCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';

function MasterclassLearnContent() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useMasterclassLearn(id);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">You do not have access to this course.</p>;

  const { masterclass, modules } = data;
  const progressPercent =
    masterclass.total_lessons > 0
      ? Math.round((masterclass.completed_lessons / masterclass.total_lessons) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to={`/dashboard/masterclasses/${id}`}
        className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {masterclass.title}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{masterclass.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {masterclass.completed_lessons} / {masterclass.total_lessons} lessons completed
        </p>
        <Progress value={progressPercent} className="mt-3 h-2" />
        {progressPercent === 100 && (
          <p className="mt-2 text-sm font-medium text-[#29cf9f]">Masterclass completed!</p>
        )}
      </div>

      <MasterclassCertificateCard masterclassId={id} />

      <div className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <Card key={module.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                Module {moduleIndex + 1}: {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {module.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id}>
                    <Link
                      to={`/dashboard/masterclasses/lessons/${lesson.id}`}
                      className="flex items-center gap-3 px-2 py-3 hover:bg-neutral-50"
                    >
                      {lesson.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#29cf9f]" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-neutral-300" />
                      )}
                      <span className="text-sm">
                        Lesson {lessonIndex + 1}: {lesson.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MasterclassLearnPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <MasterclassLearnContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
