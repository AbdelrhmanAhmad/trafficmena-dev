
import React from 'react';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import DataLoader from '@/components/DataLoader';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useProductsQuery } from '@/hooks/queries/useProductsQuery';

const Products: React.FC = () => {
  const pagination = usePagination({ itemsPerPage: 9 });
  const { data: productsData, isLoading, isError, error, refetch } = useProductsQuery(
    pagination.currentPage,
    pagination.itemsPerPage
  );

  React.useEffect(() => {
    if (productsData) {
      pagination.setTotalCount(productsData.total);
    }
  }, [productsData, pagination.setTotalCount]);

  const products = productsData?.items ?? [];

  const emptyState = (
    <div className="text-center py-12">
      <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No products available yet</h3>
      <p className="text-muted-foreground">Check back later for new digital products!</p>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Our Digital Products
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover our curated collection of digital marketing resources, courses, and tools 
              designed specifically for professionals in the MENA region. Accelerate your growth 
              with expert-created content and actionable insights.
            </p>
          </div>

          {/* Products Grid */}
          <DataLoader
            loading={isLoading}
            error={isError ? (error?.message || 'Failed to load products.') : null}
            onRetry={() => refetch()}
            isEmpty={products.length === 0}
            emptyState={emptyState}
            loadingText="Loading products..."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    imageUrl="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop"
                    title={product.name}
                    description={product.description || 'No description available.'}
                    price={product.price ? `$${product.price}` : 'Free'}
                    ctaLabel="View Product"
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => pagination.setCurrentPage(Math.max(pagination.currentPage - 1, 1))}
                    disabled={!pagination.canGoPrevious}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                      return pageNum <= pagination.totalPages ? (
                        <Button
                          key={pageNum}
                          variant={pagination.currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => pagination.setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      ) : null;
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => pagination.setCurrentPage(Math.min(pagination.currentPage + 1, pagination.totalPages))}
                    disabled={!pagination.canGoNext}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Results Summary */}
              <div className="text-center text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalCount)} of {pagination.totalCount} products
              </div>
            </div>
          </DataLoader>

          {/* Additional Information */}
          <div className="text-center mt-16">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-semibold text-primary mb-4">
                Need Something Custom?
              </h3>
              <p className="text-gray-600 mb-6">
                Looking for tailored solutions for your specific business needs? 
                Our team can create custom digital marketing resources and strategies just for you.
              </p>
              <Button size="lg" className="bg-primary-green hover:bg-primary-green/90">
                Contact Us for Custom Solutions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
