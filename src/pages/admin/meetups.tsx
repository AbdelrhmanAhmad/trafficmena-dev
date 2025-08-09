import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Plus, Users, Calendar } from 'lucide-react';
import { useErrorHandler } from '@/utils/errorHandling';
import { EventCard } from '@/components/EventCard';
import { Tables } from '@/integrations/supabase/types';

type Meetup = Tables<'events'>;

function AdminMeetups() {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetupsAndAttendees();
  }, []);

  const fetchMeetupsAndAttendees = async () => {
    try {
      setLoading(true);
      
      // Fetch all meetups and attendee counts in parallel for better performance
      const [meetupsResult, attendeeCountsResult] = await Promise.allSettled([
        // Fetch all meetups
        supabase
          .from('events')
          .select('*')
          .order('date', { ascending: false }),
        
        // Fetch attendee counts for all meetups in a single query
        supabase
          .from('event_attendees')
          .select('event_id')
      ]);

      // Handle meetups result
      if (meetupsResult.status === 'fulfilled') {
        if (meetupsResult.value.error) {
          handleError(meetupsResult.value.error);
          return;
        }
        setMeetups(meetupsResult.value.data || []);
      } else {
        console.error('Failed to fetch meetups:', meetupsResult.reason);
        toast({
          title: "Error",
          description: "Failed to load meetups. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Handle attendee counts result (non-critical - continue if this fails)
      if (attendeeCountsResult.status === 'fulfilled') {
        if (!attendeeCountsResult.value.error && attendeeCountsResult.value.data) {
          const attendeeCountsData: Record<string, number> = attendeeCountsResult.value.data.reduce((acc, attendee) => {
            acc[attendee.event_id] = (acc[attendee.event_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          setAttendeeCounts(attendeeCountsData);
        }
      } else {
        console.warn('Failed to fetch attendee counts:', attendeeCountsResult.reason);
        // Continue without attendee counts - not critical for basic functionality
      }

    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/admin/meetups/new');
  };

  const handleEditMeetup = (meetup: Meetup) => {
    navigate(`/admin/meetups/edit/${meetup.id}`);
  };

  const handleDeleteMeetup = async (meetup: Meetup) => {
    try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', meetup.id);

      if (error) {
        handleError(error);
        return;
      }

      toast({
        title: "Success",
        description: "Meetup deleted successfully.",
      });
      
      fetchMeetupsAndAttendees();
    } catch (error) {
      handleError(error);
    }
  };

  const upcomingMeetups = meetups.filter(meetup => new Date(meetup.date) > new Date());
  const pastMeetups = meetups.filter(meetup => new Date(meetup.date) <= new Date());

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Meetup Management</h1>
                <p className="text-gray-600">Manage all meetups and attendees</p>
              </div>
            </div>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Meetup
            </Button>
          </div>
          <div className="text-center py-8">Loading meetups...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Meetup Management</h1>
              <p className="text-gray-600">Manage all meetups and attendees</p>
            </div>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Meetup
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Meetups</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Meetups</CardTitle>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingMeetups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(attendeeCounts).reduce((sum, count) => sum + count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetups Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Meetups ({upcomingMeetups.length})</TabsTrigger>
            <TabsTrigger value="past">Past Meetups ({pastMeetups.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingMeetups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming meetups</h3>
                  <p className="text-muted-foreground mb-4">Create your first meetup to get started</p>
                  <Button onClick={handleCreateNew} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Meetup
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMeetups.map((meetup) => (
                  <EventCard
                    key={meetup.id}
                    event={meetup}
                    attendeeCount={attendeeCounts[meetup.id] || 0}
                    onEdit={() => handleEditMeetup(meetup)}
                    onDelete={() => handleDeleteMeetup(meetup)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past" className="space-y-4">
            {pastMeetups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past meetups</h3>
                  <p className="text-muted-foreground">Past meetups will appear here once they're completed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastMeetups.map((meetup) => (
                  <EventCard
                    key={meetup.id}
                    event={meetup}
                    attendeeCount={attendeeCounts[meetup.id] || 0}
                    onEdit={() => handleEditMeetup(meetup)}
                    onDelete={() => handleDeleteMeetup(meetup)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default AdminMeetups;