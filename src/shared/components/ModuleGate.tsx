import { Ban } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useModuleFlags } from '@/app/hooks/useSettings';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { Button } from '@/shared/components/ui/button';

type ModuleGateProps = {
  module: 'masterclasses' | 'digitalProducts';
  children: ReactNode;
  fallbackHref?: string;
};

export function ModuleGate({
  module,
  children,
  fallbackHref = '/',
}: ModuleGateProps) {
  const { isLoading, isError, masterclassesEnabled, digitalProductsEnabled } = useModuleFlags();

  const enabled = module === 'masterclasses' ? masterclassesEnabled : digitalProductsEnabled;
  const label = module === 'masterclasses' ? 'Masterclasses' : 'Digital Products';

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Fail open on network error so a temporary settings outage does not blank the site.
  if (isError) {
    return <>{children}</>;
  }

  if (!enabled) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
          <Ban className="h-7 w-7 text-neutral-500" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">{label} unavailable</h1>
        <p className="text-neutral-600">
          This module is currently disabled. Please check back later or return to the homepage.
        </p>
        <Button asChild>
          <Link to={fallbackHref}>Go back</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
