import AppLayout from '@/shared/components/layout/AppLayout';
import { useIsAdmin } from '@/shared/hooks/custom/useIsAdmin';
import { InviteOnlySettingsCard } from './components/InviteOnlySettingsCard';
import { SubscriptionSettingsCard } from './components/SubscriptionSettingsCard';

const AdminSettingsPage = () => {
  const { isAdmin } = useIsAdmin();

  return (
    <AppLayout variant="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">General Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Control access to the platform and manage subscription pricing.
          </p>
        </div>

        <InviteOnlySettingsCard canEdit={isAdmin} />
        <SubscriptionSettingsCard canEdit={isAdmin} />
      </div>
    </AppLayout>
  );
};

export default AdminSettingsPage;
