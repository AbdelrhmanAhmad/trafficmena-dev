import { ArrowLeft, CheckCircle2, PlayCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MasterclassBuyActions,
  MasterclassPrice,
} from '@/features/masterclasses/components/MasterclassBuyActions';
import { useMasterclassStoreDetail } from '@/features/masterclasses/hooks/useMasterclasses';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function MasterclassDetailContent() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMasterclassStoreDetail(id);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">الكورس غير متاح.</p>;

  const { masterclass, modules } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link to="/dashboard/masterclasses">
          <ArrowLeft className="mr-2 h-4 w-4" />
          العودة للكورسات
        </Link>
      </Button>

      {masterclass.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-2xl bg-neutral-100">
          <img
            src={masterclass.image_url}
            alt={masterclass.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{masterclass.title}</h1>
          {masterclass.description && (
            <p className="mt-3 whitespace-pre-wrap text-neutral-600">{masterclass.description}</p>
          )}
          <p className="mt-2 text-sm text-neutral-500">{masterclass.lesson_count} lessons</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {masterclass.is_enrolled && (
            <Badge className="gap-1 bg-[#29cf9f]">
              <CheckCircle2 className="h-3 w-3" />
              مسجّل — وصول دائم
            </Badge>
          )}
          <MasterclassPrice priceInCents={masterclass.price_in_cents} />
        </div>
      </div>

      {masterclass.is_enrolled ? (
        <Button onClick={() => navigate(`/dashboard/masterclasses/${id}/learn`)}>
          <PlayCircle className="mr-2 h-4 w-4" />
          ابدأ التعلّم
        </Button>
      ) : (
        <MasterclassBuyActions masterclass={masterclass} layout="inline" />
      )}

      {masterclass.is_enrolled && modules.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>محتوى الكورس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module, moduleIndex) => (
              <div key={module.id}>
                <p className="font-semibold text-neutral-900">
                  Module {moduleIndex + 1}: {module.title}
                </p>
                <ul className="mt-2 space-y-1 pl-4">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/dashboard/masterclasses/lessons/${lesson.id}`}
                        className="text-sm text-[#29cf9f] hover:underline"
                      >
                        Lesson {lessonIndex + 1}: {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MasterclassDetailPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <MasterclassDetailContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
