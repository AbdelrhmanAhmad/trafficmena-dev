import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';

const CommunityMarketingPage: React.FC = () => {
  const { t } = useTranslation('community');
  const { user } = useAuth();

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[42vw] top-[-28vh] -z-10 h-[48vh] w-[82vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[48vw] bottom-[-32vh] -z-10 h-[52vh] w-[78vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[820px] flex-col px-4 py-16 sm:px-6 lg:px-0">
          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-12 text-center shadow-[0_10px_30px_-16px_rgba(16,16,16,0.35)] backdrop-blur sm:px-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#05ef62]/20 to-[#29cf9f]/20">
              <MessageCircle className="h-6 w-6 text-[#05ef62]" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              {t('marketing.title')}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-700">
              {t('marketing.description')}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {user ? (
                <Button
                  className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] shadow hover:brightness-95"
                  asChild
                >
                  <Link to="/dashboard/community">{t('marketing.exploreHub')}</Link>
                </Button>
              ) : (
                <Button
                  className="rounded-xl bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-5 py-3 text-sm font-medium text-[#101010] shadow hover:brightness-95"
                  asChild
                >
                  <Link to="/signin">{t('marketing.signIn')}</Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="rounded-xl border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                asChild
              >
                <Link to="/meetups">{t('common:actions.rsvpEvents')}</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityMarketingPage;
