import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { EventCard } from '@/components/EventCard';
import DataLoader from '@/components/DataLoader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { EventFilters } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { useMeetupsQuery } from '@/hooks/queries/useMeetupsQuery';
import { Tables } from '@/integrations/supabase/types';

const Meetups: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EventFilters>({
    topic: 'all',
    type: 'all'
  });

  const pagination = usePagination({ itemsPerPage: 12 });
  const { data: meetupsData, isLoading, isError, error, refetch } = useMeetupsQuery(
    pagination.currentPage,
    pagination.itemsPerPage
  );

  // Keep total count in sync with pagination controls
  useEffect(() => {
    if (meetupsData) {
      pagination.setTotalCount(meetupsData.total);
    }
  }, [meetupsData, pagination.setTotalCount]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Extract unique topics from descriptions for filtering
  const getTopicFromDescription = useCallback((description: string | null) => {
    if (!description) return 'General';
    if (description.toLowerCase().includes('ai')) return 'AI in Marketing';
    if (description.toLowerCase().includes('ecommerce')) return 'eCommerce';
    if (description.toLowerCase().includes('seo')) return 'SEO';
    if (description.toLowerCase().includes('social')) return 'Social Media';
    if (description.toLowerCase().includes('content')) return 'Content Marketing';
    if (description.toLowerCase().includes('email')) return 'Email Marketing';
    if (description.toLowerCase().includes('ppc')) return 'PPC Advertising';
    return 'Digital Marketing';
  }, []);

  const meetups = meetupsData?.items ?? [];

  const filteredMeetups = useMemo(() => {
    return meetups.filter(meetup => {
      const topic = getTopicFromDescription(meetup.description);
      const topicMatch = filters.topic === 'all' || topic.toLowerCase().includes(filters.topic.replace('-', ' '));
      // Type filtering can be enhanced when we add type field to database
      return topicMatch;
    });
  }, [meetups, filters.topic, getTopicFromDescription]);

  const updateFilters = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleViewMeetupDetails = useCallback((event: Tables<'events'>) => {
    navigate(`/meetups/${event.id}`);
  }, [navigate]);

  useEffect(() => {
    // Reset pagination when filters change
    pagination.resetPagination();
  }, [filters.topic, filters.type]);

  const emptyState = (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No meetups found</h3>
      <p className="text-muted-foreground">Check back later for new events!</p>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Explore Our Meetups
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our community of marketing professionals and discover the latest trends, strategies, and networking opportunities in the MENA region.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Topic Filter */}
                <div className="min-w-[200px]">
                  <Select value={filters.topic} onValueChange={(value) => updateFilters({ topic: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      <SelectItem value="ai-marketing">AI in Marketing</SelectItem>
                      <SelectItem value="ecommerce">eCommerce</SelectItem>
                      <SelectItem value="digital-marketing">Digital Marketing</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="content-marketing">Content Marketing</SelectItem>
                      <SelectItem value="email-marketing">Email Marketing</SelectItem>
                      <SelectItem value="ppc-advertising">PPC Advertising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="min-w-[200px]">
                  <Select value={filters.type} onValueChange={(value) => updateFilters({ type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reset Filters Button */}
              <Button 
                variant="outline"
                onClick={() => updateFilters({ topic: 'all', type: 'all' })}
                className="w-full sm:w-auto"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Meetups Grid */}
          <DataLoader
            loading={isLoading}
            error={isError ? (error?.message || 'Failed to load meetups.') : null}
            onRetry={() => refetch()}
            isEmpty={filteredMeetups.length === 0}
            emptyState={emptyState}
            loadingText="Loading meetups..."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMeetups.map((meetup) => (
                  <EventCard
                    key={meetup.id}
                    event={meetup}
                    onViewDetails={handleViewMeetupDetails}
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
                Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalCount)} of {pagination.totalCount} meetups
              </div>
            </div>
          </DataLoader>
        </div>
      </div>
    </Layout>
  );
};

export default Meetups;
