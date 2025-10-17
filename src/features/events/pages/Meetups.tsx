import { Calendar } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { EventCard } from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';
import type { Event, EventFilters } from '../types';

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<EventFilters>({
    upcoming_only: true,
  });

  const itemsPerPage = 12;
  const { data, isLoading, error } = useEvents(currentPage, itemsPerPage, filters);

  const handleEventClick = (event: Event) => {
    navigate(`/meetups/${event.id}`);
  };

  const toggleUpcomingFilter = () => {
    setFilters((prev) => ({
      ...prev,
      upcoming_only: !prev.upcoming_only,
    }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil((data?.total || 0) / itemsPerPage);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-primary">Digital Marketing Events</h1>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              Join the MENA region's most engaging digital marketing events. Learn from industry
              experts, network with peers, and advance your marketing skills.
            </p>
          </div>

          {/* Event Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex justify-center">
                <Button
                  variant={filters.upcoming_only ? 'default' : 'outline'}
                  onClick={toggleUpcomingFilter}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {filters.upcoming_only ? 'Upcoming' : 'All Events'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events Grid */}
          <DataLoader
            loading={isLoading}
            error={error ? 'Failed to load events' : null}
            loadingText="Loading events..."
            onRetry={() => window.location.reload()}
          >
            {data && (
              <>
                {/* Results Info */}
                <div className="mb-6">
                  <p className="text-gray-600">
                    Showing {data.items.length} of {data.total} events
                    {filters.upcoming_only && ' (upcoming only)'}
                  </p>
                </div>

                {data.items.length > 0 ? (
                  <>
                    {/* Events Grid */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {data.items.map((event) => (
                        <EventCard key={event.id} event={event} onViewDetails={handleEventClick} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  /* No Events State */
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="mb-4 h-12 w-12 text-gray-400" />
                      <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        No events available
                      </h3>
                      <p className="mb-4 text-center text-gray-600">
                        {filters.upcoming_only ? 'No upcoming events' : 'No events'} are currently
                        scheduled.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </DataLoader>

          {/* Call to Action */}
          <Card className="mt-12 bg-primary text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h2 className="mb-4 text-2xl font-bold">Ready to Level Up Your Marketing Skills?</h2>
              <p className="mb-6 text-lg opacity-90">
                Join our community of digital marketers and never miss an event.
              </p>
              <Button size="lg" variant="secondary" onClick={() => navigate('/signup')}>
                Sign Up for Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default EventsPage;
