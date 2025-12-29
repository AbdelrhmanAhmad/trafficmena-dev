import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SeriesForm } from '@/features/series';
import { useCreateSeries } from '@/features/series/hooks/useSeries';
import AdminLayout from '@/shared/components/layout/AdminLayout';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

function NewSeriesPage() {
  const navigate = useNavigate();
  const createMutation = useCreateSeries();

  const handleSubmit = async (values: {
    title: string;
    description?: string;
    imageUrl?: string;
    isPublished: boolean;
  }) => {
    await createMutation.mutateAsync({
      title: values.title,
      description: values.description || null,
      imageUrl: values.imageUrl || null,
      isPublished: values.isPublished,
    });
    navigate('/admin/library?tab=series');
  };

  const handleCancel = () => {
    navigate('/admin/library?tab=series');
  };

  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/library')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Series</h1>
              <p className="text-muted-foreground">
                Group related library content into a series for members to explore.
              </p>
            </div>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Series Details</CardTitle>
              <CardDescription>Enter the basic information for your new series.</CardDescription>
            </CardHeader>
            <CardContent>
              <SeriesForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={createMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

export default NewSeriesPage;
