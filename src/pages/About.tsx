import { MapPin, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';

const founders = [
  {
    name: 'Mohammed Shahat',
    title: 'Co-Founder & CEO',
    photo: '/team/mohammed-shahat.jpg',
    linkedin: 'https://www.linkedin.com/in/mohammedshahat/',
  },
  {
    name: 'Hosny Abdelrahman',
    title: 'Co-Founder & Chief Growth Officer',
    photo: '/team/hosny-abdelrahman.jpg',
    linkedin: 'https://www.linkedin.com/in/meethosny/',
  },
];

const AboutPage: React.FC = () => {
  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[45vw] top-[-30vh] -z-10 h-[50vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] bottom-[-25vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-14 px-4 py-16 sm:px-6 lg:px-0">
          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-12 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600">
              <Sparkles className="h-3.5 w-3.5 text-[#05ef62]" />
              Building the region's growth hub
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              About TrafficMENA
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
              TrafficMENA is where marketers across the Middle East and North Africa come to get
              better at what they do. Live meetups online and in person, tracks that go deep on one
              skill at a time, a library of recorded sessions and playbooks, and 23 calculators for
              the daily math of running campaigns. Built in the region, for the region.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-[#05ef62]" />
                  <div>
                    <h3 className="text-base font-medium tracking-tight text-neutral-900">
                      Connect
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                      Meetups and live events across MENA. The people in the room run campaigns for
                      a living, and the conversations tend to outlast the sessions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-[#29cf9f]" />
                  <div>
                    <h3 className="text-base font-medium tracking-tight text-neutral-900">Learn</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                      Follow a full track, catch up on recorded series, or pull a playbook from the
                      library the night before a launch.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#006681]" />
                  <div>
                    <h3 className="text-base font-medium tracking-tight text-neutral-900">Grow</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                      Take what works back to your team. Subscribers get discounts on paid events,
                      and there is more coming: masterclasses, certificates, digital products.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm font-bold text-neutral-600">
              TrafficMENA is a brand of Orion Growth for Technology.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] shadow hover:brightness-95"
                asChild
              >
                <Link to="/meetups">Explore Events</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                asChild
              >
                <Link to="/library">Browse the Library</Link>
              </Button>
            </div>
          </section>

          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-12 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">The founders</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {founders.map((founder) => (
                <div
                  key={founder.name}
                  className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <img
                    src={founder.photo}
                    alt={founder.name}
                    className="aspect-square w-full rounded-2xl object-cover object-top"
                  />
                  <h3 className="mt-4 text-lg font-medium tracking-tight text-neutral-900">
                    {founder.name}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">{founder.title}</p>
                  <a
                    href={founder.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${founder.name} on LinkedIn`}
                    className="mt-3 inline-block text-[#0A66C2] transition-opacity duration-200 hover:opacity-80"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="sr-only">{founder.name} on LinkedIn</span>
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
