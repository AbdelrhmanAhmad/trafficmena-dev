import { FileText, Search } from 'lucide-react';
import { SeriesCartNavButton } from '@/features/series/components/SeriesCartNavButton';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useLibraryList } from '@/app/hooks/useLibraryAssets';
import LibraryItemCard from '@/features/library/components/LibraryItemCard';
import { SeriesGrid } from '@/features/series';
import { useSeries } from '@/features/series/hooks/useSeries';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import AppLayout from '@/shared/components/layout/AppLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

const DashboardLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('series');
  const { data: assetsData, isLoading, isError } = useLibraryList(1, 50, { excludeInTracks: true });
  const { data: seriesData, isLoading: seriesLoading } = useSeries(1, 50);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter assets based on search query
  const filteredAssets = useMemo(() => {
    if (!assetsData?.items) return [];
    if (!normalizedQuery) return assetsData.items;

    return assetsData.items.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description?.toLowerCase().includes(normalizedQuery),
    );
  }, [assetsData?.items, normalizedQuery]);

  // Transform library items to match LibraryItemCard expected format
  const transformedItems = useMemo(
    () =>
      filteredAssets.map((item) => ({
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
        event_id: item.event_id,
        is_public: item.is_public,
        is_premium: item.is_premium,
        has_access: item.has_access,
      })),
    [filteredAssets],
  );

  return (
    <ProtectedRoute>
      <AppLayout variant="member">
        <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Header */}
          <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 p-6 sm:p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d5ffe9]/10 via-transparent to-[#f4fff9]/5" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29cf9f] to-[#00fdc2] text-white shadow-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
                    My Library
                  </h1>
                  <p className="text-sm sm:text-base text-neutral-600 mt-0.5">
                    Access your exclusive marketing resources and content
                  </p>
                </div>
              </div>
              <SeriesCartNavButton />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 sm:mb-6 rounded-xl bg-neutral-100 p-1">
              <TabsTrigger
                value="series"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Series
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Single Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="series">
              {seriesLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading series..." />
                </div>
              ) : (
                <SeriesGrid series={seriesData?.items ?? []} basePath="/dashboard/library/series" />
              )}
            </TabsContent>

            <TabsContent value="content">
              {/* Search Bar */}
              <div className="mb-4 sm:mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Search library content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:max-w-md rounded-xl border-neutral-200 bg-white/80 backdrop-blur pl-10 pr-4 py-2.5 sm:py-3 text-sm transition-all duration-300 focus:border-[#29cf9f] focus:shadow-md"
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
                <Card className="rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                  <CardContent className="py-8 sm:py-12 text-center">
                    <p className="text-sm sm:text-base text-red-600">
                      Failed to load library content. Please try again later.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!isLoading && !isError && filteredAssets.length === 0 && (
                <Card className="rounded-2xl sm:rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                  <CardContent className="py-8 sm:py-12 text-center">
                    <div className="mx-auto mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/40 to-[#d5ffe9]/20">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-[#29cf9f]" />
                    </div>
                    <h3 className="mb-2 text-base sm:text-lg font-medium text-neutral-900">
                      No content available
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-600">
                      {searchQuery
                        ? 'No items match your search. Try different keywords.'
                        : 'Library content will appear here once available.'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Content Grid */}
              {!isLoading && !isError && filteredAssets.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {transformedItems.map((item) => (
                    <LibraryItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DashboardLibrary;
