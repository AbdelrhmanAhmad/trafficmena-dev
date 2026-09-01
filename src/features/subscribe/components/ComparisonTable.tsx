import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

type FeatureValue = boolean | string;

type ComparisonFeature = {
  name: string;
  free: FeatureValue;
  premium: FeatureValue;
  highlight?: boolean;
};

function ValueCell({ value, isPremium = false }: { value: FeatureValue; isPremium?: boolean }) {
  if (typeof value === 'string') {
    return (
      <span
        className={cn('text-sm font-medium', isPremium ? 'text-amber-600' : 'text-neutral-500')}
      >
        {value}
      </span>
    );
  }

  if (value) {
    return <Check className={cn('h-5 w-5', isPremium ? 'text-amber-500' : 'text-green-500')} />;
  }

  return <X className="h-5 w-5 text-neutral-300" />;
}

export function ComparisonTable() {
  const { t } = useTranslation('commerce');
  const features = t('subscribe.comparisonSection.features', {
    returnObjects: true,
  }) as ComparisonFeature[];

  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">
          {t('subscribe.comparisonSection.label')}
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {t('subscribe.comparisonSection.title')}
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          {t('subscribe.comparisonSection.subtitle')}
        </p>
      </div>

      <div className="relative z-10 mt-10 overflow-hidden rounded-2xl border border-neutral-200">
        <div className="grid grid-cols-[1fr_5rem_5rem] gap-4 bg-neutral-100 px-4 py-4 sm:grid-cols-[1fr_7rem_7rem] sm:px-6">
          <div className="text-sm font-semibold text-neutral-700">
            {t('subscribe.comparisonSection.featureColumn')}
          </div>
          <div className="text-center text-sm font-semibold text-neutral-500">
            {t('subscribe.comparisonSection.freeColumn')}
          </div>
          <div className="text-center text-sm font-semibold text-amber-600">
            {t('subscribe.comparisonSection.premiumColumn')}
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {features.map((feature, i) => (
            <div
              key={feature.name}
              className={cn(
                'grid grid-cols-[1fr_5rem_5rem] gap-4 px-4 py-4 sm:grid-cols-[1fr_7rem_7rem] sm:px-6 transition-colors',
                i % 2 === 1 && 'bg-neutral-50/50',
                feature.highlight && 'bg-amber-50/30',
              )}
            >
              <div
                className={cn(
                  'text-sm',
                  feature.highlight ? 'font-medium text-neutral-900' : 'text-neutral-700',
                )}
              >
                {feature.name}
              </div>
              <div className="flex justify-center items-center">
                <ValueCell value={feature.free} />
              </div>
              <div className="flex justify-center items-center">
                <ValueCell value={feature.premium} isPremium />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
