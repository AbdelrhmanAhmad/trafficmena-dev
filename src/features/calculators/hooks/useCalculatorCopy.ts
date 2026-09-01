import { useTranslation } from 'react-i18next';
import { getCalculatorBySlug } from '../types';

export function useCalculatorMeta(slug: string) {
  const { t } = useTranslation('calculators');
  const meta = slug ? getCalculatorBySlug(slug) : undefined;

  if (!meta) {
    return undefined;
  }

  return {
    ...meta,
    title: t(`calcs.${slug}.title`, { defaultValue: meta.title }),
    description: t(`calcs.${slug}.description`, { defaultValue: meta.description }),
    categoryLabel: t(`categories.${meta.category}`),
  };
}

export function useCalculatorCopy(slug: string) {
  const { t } = useTranslation('calculators');
  const prefix = `calcs.${slug}`;

  return {
    t,
    calc: (suffix: string, options?: Record<string, unknown>) => t(`${prefix}.${suffix}`, options),
    common: (key: string, options?: Record<string, unknown>) => t(`common.${key}`, options),
  };
}
