import { formatDistanceToNow } from 'date-fns';
import { Sparkles } from 'lucide-react';
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
  const eventModeEnabled = adminSettings.data?.eventMode ?? false;
  const settingsUpdating = updateAdminSettings.isPending;

  const inviteOnlyUpdatedAt = adminSettings.data?.updatedAt
    ? formatDistanceToNow(new Date(adminSettings.data.updatedAt), { addSuffix: true })
    : null;

  const handleInviteToggle = (checked: boolean) => {
    if (!canEdit) return;

    updateAdminSettings.mutate(
      { inviteOnly: checked, eventMode: eventModeEnabled },
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

  const handleEventModeToggle = (checked: boolean) => {
    if (!canEdit) return;

    updateAdminSettings.mutate(
      { inviteOnly: inviteOnlyEnabled, eventMode: checked },
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
            title: checked ? 'Event mode enabled' : 'Event mode disabled',
            description: checked
              ? 'Higher OTP limits are active for busy in-person sessions.'
              : 'Standard OTP limits are active again.',
          });
        },
      },
    );
  };

  return (
    <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
              <Sparkles className="h-5 w-5 text-[#05ef62]" />
            </div>
            <CardTitle className="text-neutral-900">General Settings</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Invite-only mode</p>
            <p className="text-sm text-muted-foreground">
              When enabled, only invited members can create an account.
            </p>
            {inviteOnlyUpdatedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last updated {inviteOnlyUpdatedAt}
              </p>
            )}
          </div>
          <Switch
            checked={inviteOnlyEnabled}
            disabled={!canEdit || settingsUpdating || adminSettings.isLoading}
            onCheckedChange={handleInviteToggle}
            aria-label="Toggle invite-only mode"
          />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Event mode</p>
            <p className="text-sm text-muted-foreground">
              Temporarily raises OTP limits for large in-person gatherings.
            </p>
          </div>
          <Switch
            checked={eventModeEnabled}
            disabled={!canEdit || settingsUpdating || adminSettings.isLoading}
            onCheckedChange={handleEventModeToggle}
            aria-label="Toggle event mode"
          />
        </div>
        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Only owners and admins can change these settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
