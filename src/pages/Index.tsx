
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatMeetupDate } from '@/utils/dateUtils';
import { Tables } from '@/integrations/supabase/types';
import { useErrorHandler } from '@/utils/errorHandling';
import { Users, Library, Zap } from 'lucide-react';

const Index: React.FC = () => {
  const [meetups, setMeetups] = useState<Tables<'events'>[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleError, AppErrorHandler } = useErrorHandler();

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchUpcomingMeetups = async () => {
      try {
        setLoading(true);
        
      const { data, error } = await supabase
        .from('events')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(3)
          .abortSignal(abortController.signal);

        if (!mounted) return;

        if (error) {
          handleError(error);
          // Graceful fallback for better UX
          setMeetups([]);
          return;
        }

        setMeetups(data || []);
      } catch (error) {
        if (!mounted || abortController.signal.aborted) return;
        
        handleError(error);
        // Graceful fallback on unexpected errors
        setMeetups([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUpcomingMeetups();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []); // Remove handleError from dependencies to prevent infinite loop

  // Moved to centralized utility: formatMeetupDate from '@/utils/dateUtils'

  const getTopicFromDescription = useCallback((description: string | null): string => {
    if (!description) return 'Digital Marketing';
    const words = description.toLowerCase().split(' ');
    if (words.some(word => ['ai', 'artificial', 'intelligence'].includes(word))) return 'AI & Technology';
    if (words.some(word => ['social', 'media', 'instagram', 'tiktok'].includes(word))) return 'Social Media Marketing';
    if (words.some(word => ['ecommerce', 'e-commerce', 'growth'].includes(word))) return 'E-commerce Growth';
    if (words.some(word => ['content', 'arabic', 'viral'].includes(word))) return 'Content Marketing';
    if (words.some(word => ['data', 'analytics', 'performance'].includes(word))) return 'Data Analytics';
    if (words.some(word => ['influencer', 'brand', 'partnerships'].includes(word))) return 'Influencer Marketing';
    return 'Digital Marketing';
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-secondary py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-white mb-6">
            Where MENA's <span className="text-primary-green">Marketers Grow</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Join the premier digital marketing community in the MENA region. Connect with industry professionals, attend exclusive meetups, and access premium resources to accelerate your marketing career.
          </p>
          <Button className="bg-gradient-to-r from-primary-green to-primary-gradient hover:from-primary-gradient hover:to-secondary-teal text-primary font-semibold px-8 py-3 rounded-lg transition-all duration-300 transform hover:scale-105">
            Explore Meetups
          </Button>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-primary mb-12">
            Upcoming Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              // Loading skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                    <div className="bg-gray-300 h-6 rounded mb-2"></div>
                    <div className="bg-gray-300 h-4 rounded mb-2"></div>
                    <div className="bg-gray-300 h-4 rounded w-3/4"></div>
                  </div>
                ))}
              </>
            ) : meetups.length > 0 ? (
              meetups.map((meetup) => (
                <Link key={meetup.id} to={`/meetups/${meetup.id}`}>
                  <EventCard
                    event={meetup}
                  />
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No upcoming meetups at the moment.</p>
                <p className="text-gray-400">Check back soon for new events!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-primary mb-12">
            Why Choose TrafficMENA?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-green to-primary-gradient rounded-lg flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Expert-Led Meetups</h3>
              <p className="text-gray-600">
                Learn from industry leaders and seasoned professionals through interactive online and offline meetups designed specifically for the MENA market.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary to-secondary-green rounded-lg flex items-center justify-center mx-auto mb-6">
                <Library className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Exclusive Content Library</h3>
              <p className="text-gray-600">
                Access our comprehensive library of past events, workshops, templates, and resources available exclusively to TrafficMENA members.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary-teal to-primary-gradient rounded-lg flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-4">Digital Products & Tools</h3>
              <p className="text-gray-600">
                Get access to premium courses, marketing templates, automation tools, and digital products crafted by experts to accelerate your success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-secondary to-secondary-green">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Join the Community?
          </h2>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
            Connect with like-minded professionals, expand your network, and stay ahead in the digital marketing landscape.
          </p>
          <Link to="/signup/step-1">
            <Button className="bg-primary-white text-primary hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-all duration-300 transform hover:scale-105">
              Join Community Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
