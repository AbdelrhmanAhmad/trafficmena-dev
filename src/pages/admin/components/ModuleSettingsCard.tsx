import { Boxes } from 'lucide-react';
import { useAdminSettings, useUpdateAdminSettings } from '@/app/hooks/useSettings';
import { ApiError } from '@/app/api/client';
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

  const subscriptionsEnabled = adminSettings.data?.subscriptionsEnabled ?? false;
  const masterclassesEnabled = adminSettings.data?.masterclassesEnabled ?? false;
  const digitalProductsEnabled = adminSettings.data?.digitalProductsEnabled ?? false;
  const libraryStoreEnabled = adminSettings.data?.libraryStoreEnabled ?? false;
  const masterclassesLaunched = adminSettings.data?.masterclassesLaunched ?? false;
  const digitalProductsLaunched = adminSettings.data?.digitalProductsLaunched ?? false;
  const settingsUpdating = updateAdminSettings.isPending;
  const controlsDisabled = !canEdit || settingsUpdating || adminSettings.isLoading;

  const handleToggle = (
    field:
      | 'subscriptionsEnabled'
      | 'masterclassesEnabled'
      | 'digitalProductsEnabled'
      | 'libraryStoreEnabled',
    checked: boolean,
  ) => {
    if (!canEdit) return;

    updateAdminSettings.mutate(
      { [field]: checked },
      {
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Unable to update settings. Please try again.';
          toast({
            title: 'Update failed',
            description: message,
            variant: 'destructive',
          });
        },
        onSuccess: () => {
          toast({
            title: checked ? 'Setting enabled' : 'Setting disabled',
            description: 'Module visibility updated.',
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
              Control customer-facing discovery and checkout. Admin content management stays
              available while a module is hidden.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Subscriptions</p>
            <p className="text-sm text-muted-foreground">
              Disabling prevents new subscriptions. Existing subscribers keep their benefits.
            </p>
          </div>
          <Switch
            checked={subscriptionsEnabled}
            disabled={controlsDisabled}
            onCheckedChange={(checked) => handleToggle('subscriptionsEnabled', checked)}
            aria-label="Toggle subscriptions module"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Digital Products</p>
            <p className="text-sm text-muted-foreground">
              {digitalProductsLaunched
                ? 'This section cannot be hidden after its first published product.'
                : 'Public store, member discovery, and new purchases.'}
            </p>
          </div>
          <Switch
            checked={digitalProductsEnabled}
            disabled={controlsDisabled || digitalProductsLaunched}
            onCheckedChange={(checked) => handleToggle('digitalProductsEnabled', checked)}
            aria-label="Toggle digital products module"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Masterclasses</p>
            <p className="text-sm text-muted-foreground">
              {masterclassesLaunched
                ? 'This section cannot be hidden after its first published masterclass.'
                : 'Member store, discovery, and new enrollments.'}
            </p>
          </div>
          <Switch
            checked={masterclassesEnabled}
            disabled={controlsDisabled || masterclassesLaunched}
            onCheckedChange={(checked) => handleToggle('masterclassesEnabled', checked)}
            aria-label="Toggle masterclasses module"
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
