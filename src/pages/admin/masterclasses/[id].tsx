import { Eye, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterclassCurriculumEditor } from '@/features/masterclasses/components/MasterclassCurriculumEditor';
import {
  MasterclassForm,
  masterclassFormValuesToPayload,
  type MasterclassFormValues,
} from '@/features/masterclasses/components/MasterclassForm';
import { MasterclassManualEnrollment } from '@/features/masterclasses/components/MasterclassManualEnrollment';
import { MasterclassCertificatesAdmin } from '@/features/certificates/components/MasterclassCertificatesAdmin';
import {
  useAdminMasterclassDetail,
  useDeleteMasterclass,
  useMasterclassPreview,
  useUpdateMasterclass,
} from '@/features/masterclasses/hooks/useMasterclasses';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

function EditMasterclassPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: masterclass, isLoading, isError } = useAdminMasterclassDetail(id);
  const { data: preview, isLoading: previewLoading } = useMasterclassPreview(id);
  const updateMutation = useUpdateMasterclass(id);
  const deleteMutation = useDeleteMasterclass();
  const { isAdmin } = useIsAdmin();
  const { canDeleteContent } = useRolePermissions();

  const handleSubmit = async (values: MasterclassFormValues) => {
    await updateMutation.mutateAsync(masterclassFormValuesToPayload(values));
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this masterclass permanently?')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/admin/masterclasses');
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !masterclass) return <p className="text-red-600">Masterclass not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit masterclass</h1>
          <p className="text-neutral-600">{masterclass.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/dashboard/masterclasses/${id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Preview store page
            </a>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending || !canDeleteContent}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          {isAdmin && <TabsTrigger value="certificates">Certificates</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <MasterclassForm
            masterclass={masterclass}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/admin/masterclasses')}
            isLoading={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="curriculum" className="mt-6">
          {previewLoading ? (
            <LoadingSpinner />
          ) : (
            <MasterclassCurriculumEditor
              masterclassId={id}
              modules={preview?.modules ?? []}
              canDelete={canDeleteContent}
            />
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <MasterclassManualEnrollment masterclassId={id} masterclassTitle={masterclass.title} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="certificates" className="mt-6">
            <MasterclassCertificatesAdmin masterclassId={id} masterclassTitle={masterclass.title} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function AdminMasterclassDetailPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <EditMasterclassPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
