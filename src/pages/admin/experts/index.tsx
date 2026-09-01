import { PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useExpertsAdminList } from '@/features/experts/components/ExpertForm';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function ExpertsAdminListPage() {
  const navigate = useNavigate();
  const { items, loading, error } = useExpertsAdminList();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Expert Profiles</h1>
          <p className="mt-1 text-neutral-600">Manage guest speakers and assigned expert profiles.</p>
        </div>
        <Button asChild>
          <Link to="/admin/experts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New expert
          </Link>
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-600">No expert profiles yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((expert) => (
            <Card
              key={expert.id}
              className="cursor-pointer transition hover:shadow-md"
              onClick={() => navigate(`/admin/experts/${expert.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{expert.displayNameEn}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {expert.isPublished ? <Badge className="bg-[#29cf9f]">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                  {expert.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
                  {expert.assignedUserId ? <Badge variant="outline">Assigned user</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">
                <p dir="ltr" lang="en">
                  /experts/{expert.slug}
                </p>
                <p className="mt-2">{expert.headlineEn || 'No headline yet'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminExpertsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <ExpertsAdminListPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
