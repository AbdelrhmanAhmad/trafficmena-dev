import { useNavigate } from 'react-router-dom';
import { ExpertForm } from '@/features/experts/components/ExpertForm';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';

function NewExpertPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New expert profile</h1>
        <p className="text-neutral-600">Create a guest speaker profile with bilingual content.</p>
      </div>
      <ExpertForm
        mode="create"
        onSaved={(expert) => navigate(`/admin/experts/${expert.id}`)}
        onCancel={() => navigate('/admin/experts')}
      />
    </div>
  );
}

export default function AdminNewExpertPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <NewExpertPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
