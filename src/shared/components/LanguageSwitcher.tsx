import type React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import {
  readStoredLocale,
  writeStoredLocale,
  type AppLocale,
} from '@/shared/i18n/localeManager';
import { setAppLocale } from '@/shared/i18n';

type LanguageSwitcherProps = {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = 'outline',
  size = 'sm',
}) => {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language === 'ar' ? 'ar' : 'en') as AppLocale;

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== current) {
      setAppLocale(stored);
    }
  }, [current]);

  const toggleLocale = () => {
    const next: AppLocale = current === 'ar' ? 'en' : 'ar';
    writeStoredLocale(next);
    setAppLocale(next);
  };

  // Sync on mount if storage differs from i18n (e.g. SSR/hydration edge)
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={toggleLocale}
      aria-label={t('language.switchLabel')}
    >
      {current === 'ar' ? t('language.english') : t('language.arabic')}
    </Button>
  );
};

export default LanguageSwitcher;
