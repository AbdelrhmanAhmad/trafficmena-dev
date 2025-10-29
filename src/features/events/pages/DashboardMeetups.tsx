import { format } from 'date-fns';
import { ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import DataLoader from '@/shared/components/DataLoader';
import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import ProtectedRoute from '@/shared/components/layout/ProtectedRoute';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/context/AuthContext';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';
import { useUpcomingEventsList } from '../hooks/useEventBooking';

const DashboardMeetups: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: upcoming, isLoading, error } = useUpcomingEventsList(6);

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Date TBD';
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
            <Button onClick={() => navigate('/meetups')} className="flex items-center gap-2">
              Browse Events
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <DataLoader
            loading={isLoading}
            error={error ? 'Failed to load upcoming events' : null}
            loadingText="Loading upcoming events..."
          >
            {upcoming && upcoming.items.length > 0 ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {user
                        ? 'Here is what’s coming up next for the community'
                        : 'Events you can join right now'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcoming.items.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                            <Badge variant="secondary" className="ml-2">
                              {event.event_type || 'Event'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatEventDate(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{formatEventTime(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{event.location || 'Location TBD'}</span>
                            </div>
                          </div>

                          {event.description ? (
                            <p className="mt-2 line-clamp-2 text-gray-600">
                              {stripHtmlTags(event.description)}
                            </p>
                          ) : null}
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/meetups/${event.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Events Yet</CardTitle>
                </CardHeader>
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    There are no new events to show right now
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Discover amazing marketing events and workshops designed for the MENA region.
                  </p>
                  <Button onClick={() => navigate('/meetups')}>Browse Available Events</Button>
                </CardContent>
              </Card>
            )}
          </DataLoader>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DashboardMeetups;
