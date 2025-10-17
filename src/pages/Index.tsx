import { useQuery } from '@tanstack/react-query';
import { Library, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type EventRecord, fetchEvents } from '@/app/api/events';
import { EventCard } from '@/features/events/components/EventCard';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { useErrorHandler } from '@/shared/utils/errorHandling';

const Index: React.FC = () => {
  const { handleError } = useErrorHandler();

  const {
    data: meetups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landing-events'],
    queryFn: async (): Promise<EventRecord[]> => {
      try {
        const response = await fetchEvents({ page: 1, pageSize: 3, upcoming: true });
        return response.items;
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const events = meetups ?? [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-secondary py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-5xl font-bold text-primary-white md:text-6xl">
            Where MENA's <span className="text-primary-green">Marketers Grow</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-200 md:text-2xl">
            Join the premier digital marketing community in the MENA region. Connect with industry
            professionals, attend exclusive meetups, and access premium resources to accelerate your
            marketing career.
          </p>
          <Button
            className="transform rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient px-8 py-3 font-semibold text-primary transition-all duration-300 hover:scale-105 hover:from-primary-gradient hover:to-secondary-teal"
            asChild
          >
            <Link to="/meetups">Explore Meetups</Link>
          </Button>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-4xl font-bold text-primary">Upcoming Events</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow-md">
                    <div className="mb-4 h-48 rounded-lg bg-gray-300"></div>
                    <div className="mb-2 h-6 rounded bg-gray-300"></div>
                    <div className="mb-2 h-4 rounded bg-gray-300"></div>
                    <div className="h-4 w-3/4 rounded bg-gray-300"></div>
                  </div>
                ))}
              </>
            ) : error ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-lg text-red-500">
                  We couldn't load events right now. Please try again later.
                </p>
              </div>
            ) : events.length > 0 ? (
              events.map((meetup) => (
                <Link key={meetup.id} to={`/meetups/${meetup.id}`}>
                  <EventCard event={meetup} />
                </Link>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-lg text-gray-500">No upcoming meetups at the moment.</p>
                <p className="text-gray-400">Check back soon for new events!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-4xl font-bold text-primary">
            Why Choose TrafficMENA?
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-primary-green to-primary-gradient">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-primary">Expert-Led Meetups</h3>
              <p className="text-gray-600">
                Learn from industry leaders and seasoned professionals through interactive online
                and offline meetups designed specifically for the MENA market.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-secondary to-secondary-green">
                <Library className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-primary">Exclusive Content Library</h3>
              <p className="text-gray-600">
                Access our comprehensive library of past events, workshops, templates, and resources
                available exclusively to TrafficMENA members.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-secondary-teal to-primary-gradient">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-primary">Community Support</h3>
              <p className="text-gray-600">
                Join a collaborative network of marketers, share resources, and get practical help
                from peers and mentors across the region.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-secondary to-secondary-green py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">Ready to Join the Community?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-100">
            Connect with like-minded professionals, expand your network, and stay ahead in the
            digital marketing landscape.
          </p>
          <Link to="/signup/step-1">
            <Button className="transform rounded-lg bg-primary-white px-8 py-3 font-semibold text-primary transition-all duration-300 hover:scale-105 hover:bg-gray-100">
              Join Community Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
