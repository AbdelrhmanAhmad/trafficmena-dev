import { format } from 'date-fns';
import { ArrowRight, Calendar, Clock, MapPin, Sparkles } from 'lucide-react';
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
          <div className="relative mb-8 overflow-hidden rounded-[28px] border border-neutral-200 bg-white/95 p-8 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d5ffe9]/10 via-transparent to-[#f4fff9]/5 pointer-events-none"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-neutral-900">Upcoming Events</h1>
                  <p className="text-neutral-700 mt-1">
                    {user ? 'Here is what\'s coming up next for you' : 'Events you can join right now'}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/meetups')} 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
              >
                Browse Events
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DataLoader
            loading={isLoading}
            error={error ? 'Failed to load upcoming events' : null}
            loadingText="Loading upcoming events..."
          >
            {upcoming && upcoming.items.length > 0 ? (
              <div className="space-y-6">
                <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
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
                        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-[#05ef62]/40"
                      >
                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2">{event.title}</h3>
                            <Badge className="ml-2 rounded-full border border-[#05ef62]/60 bg-[#05ef62]/10 text-[#05ef62]">
                              {event.event_type || 'Event'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-neutral-600 md:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-[#05ef62]" />
                              <span>{formatEventDate(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-[#05ef62]" />
                              <span>{formatEventTime(event.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#05ef62]" />
                              <span className="truncate">{event.location || 'Online Event'}</span>
                            </div>
                          </div>

                          {event.description ? (
                            <p className="mt-3 line-clamp-2 text-sm text-neutral-600">
                              {stripHtmlTags(event.description)}
                            </p>
                          ) : null}
                        </div>

                        <div className="ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/meetups/${event.id}`)}
                            className="rounded-xl border-neutral-200 bg-white/70 backdrop-blur hover:bg-white/90 hover:border-[#05ef62]/40 transition-all duration-300"
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
              <Card className="rounded-[28px] border border-neutral-200 bg-white/95 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                      <Calendar className="h-5 w-5 text-neutral-400" />
                    </div>
                    <CardTitle className="text-neutral-900">No Events Yet</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#f4fff9]/40 to-[#d5ffe9]/20">
                    <Calendar className="h-8 w-8 text-[#05ef62]" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    There are no new events to show right now
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Discover amazing marketing events and workshops designed for the MENA region.
                  </p>
                  <Button 
                    onClick={() => navigate('/meetups')}
                    className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-4 py-2 text-sm font-medium text-[#101010] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 active:scale-95"
                  >
                    Browse Available Events
                  </Button>
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
