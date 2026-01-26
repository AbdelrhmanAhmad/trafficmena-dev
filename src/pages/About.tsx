import { MapPin, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';

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
              TrafficMENA connects ambitious marketers across the Middle East and North Africa with
              expert-led events, actionable resources, and a trusted peer community. We ship fast,
              learn together, and focus on practical outcomes that elevate the region's marketing
              talent.
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
                      Meet marketers, founders, and operators shaping growth across the region.
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
                      Access workshops, playbooks, and content tailored for the MENA market.
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
                      Bring MENA-focused strategies back to your teams and clients with confidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
