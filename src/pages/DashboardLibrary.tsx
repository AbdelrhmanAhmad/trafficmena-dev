import { FileText, Search } from 'lucide-react';
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
          <div className="relative mb-8 overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d5ffe9]/10 via-transparent to-[#f4fff9]/5 pointer-events-none"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#29cf9f] to-[#00fdc2] text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-neutral-900">My Library</h1>
                <p className="text-neutral-700 mt-1">
                  Access your exclusive marketing resources and content
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search library content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md rounded-xl border-neutral-200 bg-white/80 backdrop-blur pl-10 pr-4 py-3 transition-all duration-300 focus:border-[#29cf9f] focus:shadow-md"
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
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardContent className="py-12 text-center">
                <p className="text-red-600">
                  Failed to load library content. Please try again later.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !isError && filteredAssets.length === 0 && (
            <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
              <CardContent className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/40 to-[#d5ffe9]/20">
                  <FileText className="h-6 w-6 text-[#29cf9f]" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-neutral-900">No content available</h3>
                <p className="text-neutral-600">
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
