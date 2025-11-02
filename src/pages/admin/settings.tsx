import AdminLayout from '@/shared/components/layout/AdminLayout';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { InviteOnlySettingsCard } from './components/InviteOnlySettingsCard';

const AdminSettingsPage = () => {
  const { isAdmin } = useIsAdmin();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">General Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Control access to the platform and manage invitation gating.
          </p>
        </div>

        <InviteOnlySettingsCard canEdit={isAdmin} />
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
