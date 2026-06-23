import { Download, FileStack } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DIGITAL_PRODUCT_FILE_TYPE_LABELS } from '@/app/api/digitalProducts';
import { DigitalProductCard } from '@/features/digital-products/components/DigitalProductCard';
import { useDigitalProductStore } from '@/features/digital-products/hooks/useDigitalProducts';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

function DigitalProductsBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') === 'mine' ? 'mine' : 'all';
  const { data, isLoading, isError } = useDigitalProductStore(filter);
  const products = data ?? [];

  const renderProducts = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }

    if (isError) {
      return <p className="text-red-600">Could not load products.</p>;
    }

    if (products.length === 0) {
      return (
        <div className="rounded-2xl border bg-white py-16 text-center text-neutral-500">
          <FileStack className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          {filter === 'mine' ? 'No purchases yet.' : 'No products available right now.'}
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <DigitalProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Digital Products</h1>
        <p className="mt-1 text-neutral-600">
          One-time purchase files and video stay available after you buy.
        </p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setSearchParams({ filter: value })}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mine">My purchases</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-2">{renderProducts()}</div>
    </div>
  );
}

export default function DigitalProductsPage() {
  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <DigitalProductsBrowse />
      </AppLayout>
    </ProtectedRoute>
  );
}

export function DigitalProductFileList({
  files,
}: {
  files: Array<{
    id: string;
    file_type: keyof typeof DIGITAL_PRODUCT_FILE_TYPE_LABELS;
    display_name: string;
    file_url: string;
  }>;
}) {
  if (files.length === 0) return null;

  return (
    <ul className="divide-y rounded-xl border bg-white">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-medium text-neutral-900">{file.display_name}</p>
            <p className="text-xs text-neutral-500">
              {DIGITAL_PRODUCT_FILE_TYPE_LABELS[file.file_type]}
            </p>
          </div>
          <a
            href={file.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}
