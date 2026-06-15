import { FileStack, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminDigitalProducts } from '@/features/digital-products/hooks/useDigitalProducts';
import { formatSeriesPriceLabel } from '@/features/series/utils/seriesPricing';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AdminProtectedRoute from '@/shared/components/layout/AdminProtectedRoute';
import AppLayout from '@/shared/components/layout/AppLayout';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function DigitalProductsManagement() {
  const navigate = useNavigate();
  const { data: products, isLoading, isError } = useAdminDigitalProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Digital Products Management</h1>
          <p className="mt-1 text-neutral-600">
            Manage digital products with files and optional tutorial videos.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/digital-products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <p className="text-red-600">Failed to load products.</p>
      ) : !products?.length ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FileStack className="mb-4 h-12 w-12 text-neutral-300" />
            <p className="text-neutral-600">No digital products yet.</p>
            <Button className="mt-4" asChild>
              <Link to="/admin/digital-products/new">Create your first product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer rounded-2xl transition hover:shadow-md"
              onClick={() => navigate(`/admin/digital-products/${product.id}`)}
            >
              {product.imageUrl ? (
                <div className="aspect-video overflow-hidden rounded-t-2xl bg-neutral-100">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">{product.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {product.salesEnabled ? (
                    <Badge className="bg-[#29cf9f]">Sales on</Badge>
                  ) : (
                    <Badge variant="secondary">Sales off</Badge>
                  )}
                  {!product.isPublished && <Badge variant="outline">Draft</Badge>}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">
                <p>{product.fileCount ?? 0} files</p>
                <p className="mt-1 font-medium text-neutral-900">
                  {product.priceInCents
                    ? formatSeriesPriceLabel(product.priceInCents)
                    : 'No price set'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDigitalProductsPage() {
  return (
    <AdminProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
      <AppLayout variant="admin">
        <DigitalProductsManagement />
      </AppLayout>
    </AdminProtectedRoute>
  );
}
