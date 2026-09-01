import { useTranslation } from 'react-i18next';
import Layout from '@/shared/components/layout/Layout';

const TERMS_SECTION_KEYS = [
  'acceptance',
  'useOfService',
  'userContent',
  'eventRegistration',
  'intellectualProperty',
  'limitationOfLiability',
  'termination',
  'changes',
  'governingLaw',
  'contact',
] as const;

const TermsOfService = () => {
  const { t } = useTranslation('legal');
  const dir = typeof document !== 'undefined' ? document.documentElement.dir : 'ltr';

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16 text-start" dir={dir}>
        <h1 className="text-4xl font-bold text-neutral-900">{t('terms.title')}</h1>
        <p className="mt-4 text-sm text-neutral-500">{t('terms.lastUpdated')}</p>

        <div className="mt-8 space-y-8 text-neutral-700">
          {TERMS_SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-semibold text-neutral-900">
                {t(`terms.sections.${key}.title`)}
              </h2>
              <p className="mt-3 leading-relaxed">{t(`terms.sections.${key}.body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
