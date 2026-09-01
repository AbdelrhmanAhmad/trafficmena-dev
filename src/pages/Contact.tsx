import { Mail, Phone, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WhatsAppIcon } from '@/shared/components/icons/WhatsAppIcon';
import Layout from '@/shared/components/layout/Layout';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_E164,
  WHATSAPP_URL,
} from '@/shared/constants/contact';

const ContactPage = () => {
  const { t } = useTranslation('common');

  const actions = useMemo(
    () =>
      [
        {
          key: 'email',
          title: t('contact.emailTitle'),
          description: t('contact.emailDesc'),
          value: CONTACT_EMAIL,
          href: `mailto:${CONTACT_EMAIL}`,
          icon: Mail,
          external: false,
          iconClassName: 'text-[#05ef62]',
        },
        {
          key: 'phone',
          title: t('contact.phoneTitle'),
          description: t('contact.phoneDesc'),
          value: CONTACT_PHONE_DISPLAY,
          href: `tel:${CONTACT_PHONE_E164}`,
          icon: Phone,
          external: false,
          iconClassName: 'text-[#05ef62]',
        },
        {
          key: 'whatsapp',
          title: t('contact.whatsappTitle'),
          description: t('contact.whatsappDesc'),
          value: CONTACT_PHONE_DISPLAY,
          href: WHATSAPP_URL,
          icon: WhatsAppIcon,
          external: true,
          iconClassName: 'text-[#25D366]',
        },
      ] as const,
    [t],
  );

  return (
    <Layout>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-[45vw] top-[-30vh] -z-10 h-[50vh] w-[85vw] rounded-full bg-gradient-to-br from-[#d5ffe9]/70 via-[#f4fff9]/40 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -right-[50vw] bottom-[-25vh] -z-10 h-[55vh] w-[80vw] rounded-full bg-gradient-to-tr from-[#00fdc2]/25 via-[#05ef62]/20 to-transparent blur-[90px]" />

        <div className="relative mx-auto flex w-full max-w-[1000px] flex-col px-4 py-16 sm:px-6 lg:px-0">
          <section className="w-full rounded-[28px] border border-neutral-200 bg-white/90 px-6 py-12 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] backdrop-blur sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600">
              <Sparkles className="h-3.5 w-3.5 text-[#05ef62]" />
              {t('contact.badge')}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              {t('contact.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-700">
              {t('contact.description')}
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {actions.map(
                ({ key, title, description, value, href, icon: Icon, external, iconClassName }) => (
                  <a
                    key={key}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05ef62] focus-visible:ring-offset-2"
                  >
                    <Icon className={`h-6 w-6 ${iconClassName}`} aria-hidden="true" />
                    <h2 className="mt-4 text-base font-medium tracking-tight text-neutral-900">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
                    <p className="mt-4 break-words text-sm font-medium text-neutral-900">{value}</p>
                  </a>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
