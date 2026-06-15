import { GraduationCap, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminMasterclasses } from '@/features/masterclasses/hooks/useMasterclasses';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function MasterclassesManagement() {
  const navigate = useNavigate();
  const { data: items, isLoading, isError } = useAdminMasterclasses();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Masterclasses</h1>
          <p className="mt-1 text-neutral-600">
            Manage courses with modules, lessons, videos, and files.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/masterclasses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New masterclass
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <p className="text-red-600">Failed to load masterclasses.</p>
      ) : !items?.length ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <GraduationCap className="mb-4 h-12 w-12 text-neutral-300" />
            <p className="text-neutral-600">No masterclasses yet.</p>
            <Button className="mt-4" asChild>
              <Link to="/admin/masterclasses/new">Create your first masterclass</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer rounded-2xl transition hover:shadow-md"
              onClick={() => navigate(`/admin/masterclasses/${item.id}`)}
            >
              {item.imageUrl ? (
                <div className="aspect-video overflow-hidden rounded-t-2xl bg-neutral-100">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {item.isPublished ? (
                    <Badge className="bg-[#29cf9f]">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">
                <p>{item.lessonCount ?? 0} lessons</p>
                <p className="mt-1 font-medium text-neutral-900">
                  {item.priceInCents
                    ? formatSeriesPriceLabel(item.priceInCents)
                    : 'No price set'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminMasterclassesPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <MasterclassesManagement />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
