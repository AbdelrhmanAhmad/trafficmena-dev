import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { GlobalCertificateSettingsForm } from '@/features/certificates/components/GlobalCertificateSettingsForm';

function CertificateSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GlobalCertificateSettingsForm />
    </div>
  );
}

export default function AdminCertificateSettingsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin']}>
      <AppLayout variant="admin">
        <CertificateSettingsPage />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
