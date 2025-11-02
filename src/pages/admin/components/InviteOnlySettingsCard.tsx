import { formatDistanceToNow } from 'date-fns';
import { useAdminSettings, useUpdateAdminSettings } from '@/app/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';

interface InviteOnlySettingsCardProps {
  canEdit: boolean;
}

export function InviteOnlySettingsCard({ canEdit }: InviteOnlySettingsCardProps) {
  const { toast } = useToast();
  const adminSettings = useAdminSettings();
  const updateAdminSettings = useUpdateAdminSettings();

  const inviteOnlyEnabled = adminSettings.data?.inviteOnly ?? false;
  const settingsUpdating = updateAdminSettings.isPending;

  const inviteOnlyUpdatedAt = adminSettings.data?.updatedAt
    ? formatDistanceToNow(new Date(adminSettings.data.updatedAt), { addSuffix: true })
    : null;

  const handleToggle = (checked: boolean) => {
    if (!canEdit) return;

    updateAdminSettings.mutate(
      { inviteOnly: checked },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Unable to update settings. Please try again.';
          toast({
            title: 'Update failed',
            description: message,
            variant: 'destructive',
          });
        },
        onSuccess: () => {
          toast({
            title: checked ? 'Invite-only enabled' : 'Invite-only disabled',
            description: checked
              ? 'New members must be invited to join.'
              : 'Public sign-up is available again.',
          });
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">General Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Invite-only mode</p>
          <p className="text-sm text-muted-foreground">
            When enabled, only invited members can create an account.
          </p>
          {inviteOnlyUpdatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">Last updated {inviteOnlyUpdatedAt}</p>
          )}
          {!canEdit && (
            <p className="mt-2 text-xs text-muted-foreground">
              Only owners and admins can change this setting.
            </p>
          )}
        </div>
        <Switch
          checked={inviteOnlyEnabled}
          disabled={!canEdit || settingsUpdating || adminSettings.isLoading}
          onCheckedChange={handleToggle}
          aria-label="Toggle invite-only mode"
        />
      </CardContent>
    </Card>
  );
}
