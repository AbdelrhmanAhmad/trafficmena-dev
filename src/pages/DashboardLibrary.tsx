import { FileText } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useLibraryList } from '@/app/hooks/useLibraryAssets';
import LibraryItemCard from '@/features/library/components/LibraryItemCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

const DashboardLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: assetsData, isLoading, isError } = useLibraryList(1, 50);

  // Filter assets based on search query
  const filteredAssets =
    assetsData?.items?.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  // Transform library items to match LibraryItemCard expected format
  const transformedItems = filteredAssets.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    file_type: item.file_type,
    video_url: item.video_url,
    document_url: item.document_url,
    embed_url: item.embed_url,
    embed_type: item.embed_type,
    file_url: item.file_url, // Legacy field for backward compatibility
    created_at: item.created_at,
    view_count: item.view_count,
    download_count: item.download_count,
  }));

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">My Library</h1>

          {/* Search Bar */}
          <div className="mb-6">
            <Input
              type="search"
              placeholder="Search library content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading library content..." />
            </div>
          )}

          {/* Error State */}
          {isError && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-red-600">
                  Failed to load library content. Please try again later.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !isError && filteredAssets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No content available</h3>
                <p className="text-gray-600">
                  {searchQuery
                    ? 'No items match your search. Try different keywords.'
                    : 'Library content will appear here once available.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Content Grid */}
          {!isLoading && !isError && filteredAssets.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {transformedItems.map((item) => (
                <LibraryItemCard key={item.id} item={item} isAdmin={false} />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardLibrary;
