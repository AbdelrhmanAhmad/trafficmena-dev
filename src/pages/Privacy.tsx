import { useTranslation } from 'react-i18next';
import Layout from '@/shared/components/layout/Layout';

const PRIVACY_SECTION_KEYS = [
  'informationWeCollect',
  'howWeUse',
  'informationSharing',
  'dataSecurity',
  'yourRights',
  'cookies',
  'changes',
  'contact',
] as const;

const PrivacyPolicy = () => {
  const { t } = useTranslation('legal');
  const dir = typeof document !== 'undefined' ? document.documentElement.dir : 'ltr';

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-16 text-start" dir={dir}>
        <h1 className="text-4xl font-bold text-neutral-900">{t('privacy.title')}</h1>
        <p className="mt-4 text-sm text-neutral-500">{t('privacy.lastUpdated')}</p>

        <div className="mt-8 space-y-8 text-neutral-700">
          {PRIVACY_SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-semibold text-neutral-900">
                {t(`privacy.sections.${key}.title`)}
              </h2>
              <p className="mt-3 leading-relaxed">{t(`privacy.sections.${key}.body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
