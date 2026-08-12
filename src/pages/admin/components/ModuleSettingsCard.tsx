import { Boxes } from 'lucide-react';
import { useAdminSettings, useUpdateAdminSettings } from '@/app/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/custom/use-toast';

type ModuleSettingsCardProps = {
  canEdit: boolean;
};

export function ModuleSettingsCard({ canEdit }: ModuleSettingsCardProps) {
  const { toast } = useToast();
  const adminSettings = useAdminSettings();
  const updateAdminSettings = useUpdateAdminSettings();

  const masterclassesEnabled = adminSettings.data?.masterclassesEnabled ?? true;
  const digitalProductsEnabled = adminSettings.data?.digitalProductsEnabled ?? true;
  const libraryStoreEnabled = adminSettings.data?.libraryStoreEnabled ?? false;
  const settingsUpdating = updateAdminSettings.isPending;
  const controlsDisabled = !canEdit || settingsUpdating || adminSettings.isLoading;

  const handleToggle = (
    field: 'masterclassesEnabled' | 'digitalProductsEnabled' | 'libraryStoreEnabled',
    checked: boolean,
  ) => {
    if (!canEdit) return;

    const labels =
      field === 'masterclassesEnabled'
        ? { on: 'Masterclasses enabled', off: 'Masterclasses disabled' }
        : field === 'digitalProductsEnabled'
          ? { on: 'Digital Products enabled', off: 'Digital Products disabled' }
          : {
              on: 'Library store enabled',
              off: 'Library store disabled',
            };

    updateAdminSettings.mutate(
      { [field]: checked },
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
            title: checked ? labels.on : labels.off,
            description:
              field === 'libraryStoreEnabled'
                ? checked
                  ? 'Members can browse and purchase recordings from My Recordings.'
                  : 'My Recordings shows only content members already have access to. Purchases stay on track/event pages.'
                : checked
                  ? 'The module is visible again across the site and dashboards.'
                  : 'The module is hidden for members and disabled in admin navigation.',
          });
        },
      },
    );
  };

  return (
    <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d5ffe9]/40 to-[#f4fff9]/20">
            <Boxes className="h-5 w-5 text-[#05ef62]" />
          </div>
          <div>
            <CardTitle className="text-neutral-900">Module visibility</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn modules off to hide them from the public site, member dashboard, and admin menu.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Masterclasses</p>
            <p className="text-sm text-muted-foreground">
              Member dashboard, admin CRUD, and related navigation.
            </p>
          </div>
          <Switch
            checked={masterclassesEnabled}
            disabled={controlsDisabled}
            onCheckedChange={(checked) => handleToggle('masterclassesEnabled', checked)}
            aria-label="Toggle masterclasses module"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Digital Products</p>
            <p className="text-sm text-muted-foreground">
              Public store, member store, admin CRUD, and header link.
            </p>
          </div>
          <Switch
            checked={digitalProductsEnabled}
            disabled={controlsDisabled}
            onCheckedChange={(checked) => handleToggle('digitalProductsEnabled', checked)}
            aria-label="Toggle digital products module"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Library store</p>
            <p className="text-sm text-muted-foreground">
              When off (default), My Recordings lists only owned or accessible content. Recordings
              are purchased from track or event pages instead.
            </p>
          </div>
          <Switch
            checked={libraryStoreEnabled}
            disabled={controlsDisabled}
            onCheckedChange={(checked) => handleToggle('libraryStoreEnabled', checked)}
            aria-label="Toggle library store"
          />
        </div>

        {!canEdit && (
          <p className="text-xs text-muted-foreground">
            Only owners and admins can change module settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
