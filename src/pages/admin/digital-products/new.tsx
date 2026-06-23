import { useNavigate } from 'react-router-dom';
import {
  DigitalProductForm,
  digitalProductFormValuesToPayload,
  type DigitalProductFormValues,
} from '@/features/digital-products/components/DigitalProductForm';
import { useCreateDigitalProduct } from '@/features/digital-products/hooks/useDigitalProducts';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';

function NewDigitalProductPage() {
  const navigate = useNavigate();
  const createMutation = useCreateDigitalProduct();

  const handleSubmit = async (values: DigitalProductFormValues) => {
    const product = await createMutation.mutateAsync(digitalProductFormValuesToPayload(values));
    navigate(`/admin/digital-products/${product.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New digital product</h1>
        <p className="text-neutral-600">
          Create the product first, then add video URLs and files on the next screen.
        </p>
      </div>
      <DigitalProductForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/digital-products')}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

export default function AdminNewDigitalProductPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <NewDigitalProductPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
