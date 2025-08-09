
import React, { useEffect, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, Users, User, CheckCircle, Video, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DataLoader from '@/components/DataLoader';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const MeetupDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetup, setMeetup] = useState<Tables<'events'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [isBooked, setIsBooked] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const fetchMeetup = async () => {
      if (!id) {
        setError('Meetup ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch meetup details
        const { data: meetupData, error: meetupError } = await supabase
          .from('events')
          .select('id, title, description, date, location, max_attendees, image_url, tags, host_name, host_bio, host_image_url, agenda, prerequisites, meeting_link, what_youll_learn')
          .eq('id', id)
          .maybeSingle();

        if (meetupError) {
          setError('Meetup not found');
          return;
        }

        // Fetch attendee count
        const { count, error: countError } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id);

        if (countError) {
          console.error('Error fetching attendee count:', countError);
        }

        // Check if current user is already booked (if authenticated)
        let userBooked = false;
        if (user) {
          const { data: bookingData, error: bookingError } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!bookingError && bookingData) {
            userBooked = true;
          }
        }

        setMeetup(meetupData as Tables<'events'>);
        setAttendeeCount(count || 0);
        setIsBooked(userBooked);
      } catch (err) {
        setError('Failed to load meetup details');
        console.error('Error fetching meetup:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetup();
  }, [id, user]);

  const handleBookMeetup = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book this meetup.",
        variant: "destructive",
      });
      return;
    }

    if (!id || !meetup) {
      return;
    }

    setBooking(true);

    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: id,
          user_id: user.id,
        });

      if (error) {
        // Handle duplicate booking gracefully
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already Booked",
            description: "You're already registered for this meetup!",
            variant: "destructive",
          });
          setIsBooked(true);
        } else {
          throw error;
        }
      } else {
        // Success - refresh attendee count and booking status
        setIsBooked(true);
        setAttendeeCount(prev => prev + 1);
        
        toast({
          title: "Booking Confirmed!",
          description: "You've successfully registered for this meetup.",
        });
      }
    } catch (err) {
      console.error('Booking error:', err);
      toast({
        title: "Booking Failed",
        description: "Failed to register for this meetup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  const formatMeetupDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatMeetupTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  return (
    <Layout>
      <DataLoader
        loading={loading}
        error={error}
        loadingText="Loading meetup details..."
        onRetry={() => window.location.reload()}
      >
        {meetup && (
          <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {/* Event Header */}
              <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-primary mb-4">
                    {meetup.title}
                  </h1>
                  <div className="flex flex-wrap gap-6 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <span>{formatMeetupDate(meetup.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span>{formatMeetupTime(meetup.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <span>{meetup.location || 'Location TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span>{attendeeCount} / {meetup.max_attendees || 'Unlimited'} attendees</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Event Image */}
                  {meetup.image_url && (
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={meetup.image_url} 
                        alt={meetup.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle>About This Meetup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        {meetup.description ? (
                          meetup.description.split('\n\n').map((paragraph: string, index: number) => (
                            <p key={index} className="text-gray-700 mb-4 leading-relaxed">
                              {paragraph}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">No description available.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Host Information */}
                  {(meetup.host_name || meetup.host_bio || meetup.host_image_url) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Meet Your Host
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={meetup.host_image_url} alt={meetup.host_name} />
                            <AvatarFallback>
                              {meetup.host_name ? meetup.host_name.split(' ').map((n: string) => n[0]).join('') : 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            {meetup.host_name && (
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {meetup.host_name}
                              </h3>
                            )}
                            {meetup.host_bio && (
                              <p className="text-gray-600 leading-relaxed">
                                {meetup.host_bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* What You'll Learn */}
                  {meetup.what_youll_learn && meetup.what_youll_learn.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          What You'll Learn
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {meetup.what_youll_learn.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Agenda */}
                  {meetup.agenda && meetup.agenda.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Agenda
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {meetup.agenda.map((item: string, index: number) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{index + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-700">{item}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Prerequisites */}
                  {meetup.prerequisites && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Prerequisites</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {meetup.prerequisites}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Meeting Link */}
                  {meetup.meeting_link && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <Video className="h-5 w-5" />
                          Join the Meeting
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-green-700 mb-4">
                          Use the link below to join the online meetup:
                        </p>
                        <Button 
                          asChild 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <a 
                            href={meetup.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Video className="h-4 w-4" />
                            Join Meeting
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tags */}
                  {meetup.tags && meetup.tags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Topics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {meetup.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column - Registration Card */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-8">
                    <CardHeader>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          Free
                        </div>
                        <p className="text-gray-600">per person</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <Button 
                        className="w-full h-12 text-lg font-semibold"
                        onClick={handleBookMeetup}
                        disabled={booking || isBooked || (meetup.max_attendees && attendeeCount >= meetup.max_attendees)}
                      >
                        {booking ? 'Booking...' : isBooked ? 'Already Registered' : 'Register Now'}
                      </Button>

                      {/* Additional Info */}
                      <div className="border-t pt-6 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Event ID:</span>
                          <span className="font-medium">#{id}</span>
                        </div>
                        {meetup.max_attendees && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Spots Available:</span>
                            <span className={`font-medium ${meetup.max_attendees - attendeeCount > 5 ? 'text-green-600' : 'text-orange-600'}`}>
                              {meetup.max_attendees - attendeeCount} left
                            </span>
                          </div>
                        )}
                        {isBooked && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium text-green-600">✓ Registered</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </DataLoader>
    </Layout>
  );
};

export default MeetupDetail;
