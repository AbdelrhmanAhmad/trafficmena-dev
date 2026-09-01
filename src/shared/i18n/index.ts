import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  applyDocumentLocale,
  DEFAULT_LOCALE,
  readStoredLocale,
  type AppLocale,
} from './localeManager';
import arAuth from './locales/ar/auth.json';
import arCalendar from './locales/ar/calendar.json';
import arCommerce from './locales/ar/commerce.json';
import arCommon from './locales/ar/common.json';
import arDashboard from './locales/ar/dashboard.json';
import arErrors from './locales/ar/errors.json';
import arEvents from './locales/ar/events.json';
import arLegal from './locales/ar/legal.json';
import arLibrary from './locales/ar/library.json';
import arNav from './locales/ar/nav.json';
import arPayments from './locales/ar/payments.json';
import arTracks from './locales/ar/tracks.json';
import arCalculators from './locales/ar/calculators.json';
import enAuth from './locales/en/auth.json';
import enCalendar from './locales/en/calendar.json';
import enCommerce from './locales/en/commerce.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enErrors from './locales/en/errors.json';
import enEvents from './locales/en/events.json';
import enLegal from './locales/en/legal.json';
import enLibrary from './locales/en/library.json';
import enNav from './locales/en/nav.json';
import enPayments from './locales/en/payments.json';
import enTracks from './locales/en/tracks.json';
import enCalculators from './locales/en/calculators.json';

export const APP_NAMESPACES = [
  'common',
  'nav',
  'auth',
  'events',
  'tracks',
  'library',
  'commerce',
  'payments',
  'dashboard',
  'calendar',
  'errors',
  'legal',
  'calculators',
] as const;

const initialLocale = readStoredLocale();
applyDocumentLocale(initialLocale);

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ['en', 'ar'],
  ns: [...APP_NAMESPACES],
  defaultNS: 'common',
  resources: {
    en: {
      common: enCommon,
      nav: enNav,
      auth: enAuth,
      events: enEvents,
      tracks: enTracks,
      library: enLibrary,
      commerce: enCommerce,
      payments: enPayments,
      dashboard: enDashboard,
      calendar: enCalendar,
      errors: enErrors,
      legal: enLegal,
      calculators: enCalculators,
    },
    ar: {
      common: arCommon,
      nav: arNav,
      auth: arAuth,
      events: arEvents,
      tracks: arTracks,
      library: arLibrary,
      commerce: arCommerce,
      payments: arPayments,
      dashboard: arDashboard,
      calendar: arCalendar,
      errors: arErrors,
      legal: arLegal,
      calculators: arCalculators,
    },
  },
  interpolation: { escapeValue: false },
});

export function setAppLocale(locale: AppLocale): void {
  void i18n.changeLanguage(locale);
  applyDocumentLocale(locale);
}

export default i18n;
