import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  applyDocumentLocale,
  DEFAULT_LOCALE,
  readStoredLocale,
  type AppLocale,
} from './localeManager';
import arAuth from './locales/ar/auth.json';
import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';

const initialLocale = readStoredLocale();
applyDocumentLocale(initialLocale);

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ['en', 'ar'],
  ns: ['common', 'nav', 'auth'],
  defaultNS: 'common',
  resources: {
    en: { common: enCommon, nav: enNav, auth: enAuth },
    ar: { common: arCommon, nav: arNav, auth: arAuth },
  },
  interpolation: { escapeValue: false },
});

export function setAppLocale(locale: AppLocale): void {
  void i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
}

export default i18n;
