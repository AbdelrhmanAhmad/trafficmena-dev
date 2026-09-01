import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '@/shared/components/layout/Layout';

const REFUND_SECTION_KEYS = [
  'eventRegistrations',
  'trackBookings',
  'eventSpecificTerms',
  'howToRequest',
  'underSevenDays',
  'subscriptions',
  'questions',
] as const;

const LINKED_SECTION_KEYS = new Set(['howToRequest', 'questions']);

const contactLink = (
  <Link className="font-medium text-[#006681] underline" to="/contact" />
);

const RefundPolicy = () => {
  const { t } = useTranslation('legal');
  const dir = typeof document !== 'undefined' ? document.documentElement.dir : 'ltr';

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16 text-start" dir={dir}>
        <h1 className="text-4xl font-bold text-neutral-900">{t('refund.title')}</h1>
        <p className="mt-4 text-sm text-neutral-500">{t('refund.lastUpdated')}</p>

        <div className="mt-8 rounded-2xl border border-[#05ef62]/50 bg-[#d5ffe9]/50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900">{t('refund.guarantee.title')}</h2>
          <p className="mt-3 leading-relaxed text-neutral-700">{t('refund.guarantee.body')}</p>
        </div>

        <div className="mt-8 space-y-8 text-neutral-700">
          {REFUND_SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-semibold text-neutral-900">
                {t(`refund.sections.${key}.title`)}
              </h2>
              {LINKED_SECTION_KEYS.has(key) ? (
                <p className="mt-3 leading-relaxed">
                  <Trans
                    components={{ contactLink }}
                    i18nKey={`refund.sections.${key}.body`}
                    ns="legal"
                  />
                </p>
              ) : (
                <p className="mt-3 leading-relaxed">{t(`refund.sections.${key}.body`)}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default RefundPolicy;
