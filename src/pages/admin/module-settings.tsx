import AppLayout from '@/shared/components/layout/AppLayout';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { ModuleSettingsCard } from './components/ModuleSettingsCard';

const AdminModuleSettingsPage = () => {
  const { isAdmin } = useIsAdmin();

  return (
    <AppLayout variant="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Module Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Enable or disable product modules for customers. Hidden modules stay manageable in admin
            while draft content is prepared.
          </p>
        </div>

        <ModuleSettingsCard canEdit={isAdmin} />
      </div>
    </AppLayout>
  );
};

export default AdminModuleSettingsPage;
