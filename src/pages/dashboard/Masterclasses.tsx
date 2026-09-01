import { GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { MasterclassCard } from '@/features/masterclasses/components/MasterclassCard';
import { useMasterclassStore } from '@/features/masterclasses/hooks/useMasterclasses';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

function MasterclassesBrowse() {
  const { t } = useTranslation('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') === 'mine' ? 'mine' : 'all';
  const { data, isLoading, isError } = useMasterclassStore(filter);
  const items = data ?? [];

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    if (isError) {
      return <p className="text-red-600">{t('masterclasses.loadError')}</p>;
    }

    if (items.length === 0) {
      return (
        <div className="rounded-2xl border bg-white py-16 text-center text-neutral-500">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          {filter === 'mine' ? t('masterclasses.emptyMine') : t('masterclasses.emptyAll')}
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <MasterclassCard key={item.id} masterclass={item} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('masterclasses.title')}</h1>
        <p className="mt-1 text-neutral-600">{t('masterclasses.subtitle')}</p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setSearchParams({ filter: value })}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">{t('masterclasses.tabAll')}</TabsTrigger>
          <TabsTrigger value="mine">{t('masterclasses.tabMine')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-2">{renderGrid()}</div>
    </div>
  );
}

export default function MasterclassesPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <MasterclassesBrowse />
      </AppLayout>
    </ProtectedRoute>
  );
}
