import { useNavigate } from 'react-router-dom';
import {
  MasterclassForm,
  masterclassFormValuesToPayload,
  type MasterclassFormValues,
} from '@/features/masterclasses/components/MasterclassForm';
import { useCreateMasterclass } from '@/features/masterclasses/hooks/useMasterclasses';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';

function NewMasterclassPage() {
  const navigate = useNavigate();
  const createMutation = useCreateMasterclass();

  const handleSubmit = async (values: MasterclassFormValues) => {
    const created = await createMutation.mutateAsync(masterclassFormValuesToPayload(values));
    navigate(`/admin/masterclasses/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New masterclass</h1>
        <p className="text-neutral-600">Create the course, then add modules and lessons.</p>
      </div>
      <MasterclassForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/masterclasses')}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

export default function AdminNewMasterclassPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <NewMasterclassPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
