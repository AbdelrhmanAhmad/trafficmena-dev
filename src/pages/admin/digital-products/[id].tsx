import { Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DigitalProductForm,
  digitalProductFormValuesToPayload,
  type DigitalProductFormValues,
} from '@/features/digital-products/components/DigitalProductForm';
import {
  useAdminDigitalProductDetail,
  useDeleteDigitalProduct,
  useUpdateDigitalProduct,
} from '@/features/digital-products/hooks/useDigitalProducts';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { useRolePermissions } from '@/shared/hooks/custom/useRolePermissions';

function EditDigitalProductPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAdminDigitalProductDetail(id);
  const updateMutation = useUpdateDigitalProduct(id);
  const deleteMutation = useDeleteDigitalProduct();
  const { canDeleteContent } = useRolePermissions();

  const handleSubmit = async (values: DigitalProductFormValues) => {
    await updateMutation.mutateAsync(digitalProductFormValuesToPayload(values));
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this digital product permanently?')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/admin/digital-products');
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <p className="text-red-600">Product not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Edit digital product</h1>
          <p className="text-neutral-600">{data.product.title}</p>
        </div>
        {canDeleteContent && (
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
      <DigitalProductForm
        product={data.product}
        files={data.files}
        videos={data.videos}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/digital-products')}
        isLoading={updateMutation.isPending}
        canDeleteFiles={canDeleteContent}
      />
    </div>
  );
}

export default function AdminDigitalProductDetailPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <EditDigitalProductPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
