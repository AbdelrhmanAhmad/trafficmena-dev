import { ArrowRight, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';

const INVITATION_CACHE_KEY = 'trafficmena:last-invitation-token';

export default function InviteOnlyPage() {
  const navigate = useNavigate();
  const [cachedInvitePath, setCachedInvitePath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const token = sessionStorage.getItem(INVITATION_CACHE_KEY);
      if (token) {
        setCachedInvitePath(`/invitation/${token}`);
      }
    } catch {
      setCachedInvitePath(null);
    }
  }, []);

  return (
    <Layout>
      <div className="relative isolate min-h-screen overflow-hidden bg-neutral-50">
        <div className="pointer-events-none absolute -left-[40vw] top-[-30vh] -z-10 h-[50vh] w-[80vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/50 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[44vw] bottom-[-32vh] -z-10 h-[55vh] w-[78vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-24 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
            Private beta
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-900">
            TrafficMENA is currently invite-only
          </h1>
          <p className="mt-4 text-base text-neutral-600">
            We’re onboarding founding members in small batches to keep the experience personal. If
            you have an invitation, you can continue from your email link. Otherwise, reach out and
            we’ll let you know when the next cohort opens.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-6 py-3 font-semibold text-[#101010] shadow-sm hover:brightness-95"
              onClick={() => {
                if (cachedInvitePath) {
                  navigate(cachedInvitePath);
                } else {
                  navigate('/signin');
                }
              }}
            >
              <span>{cachedInvitePath ? 'Resume invitation' : 'I have an invite'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-neutral-200 px-6 py-3 font-medium text-neutral-700 hover:bg-neutral-50"
              onClick={() => {
                window.location.href = 'mailto:hello@trafficmena.com';
              }}
            >
              <Mail className="h-4 w-4" />
              Contact the team
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
