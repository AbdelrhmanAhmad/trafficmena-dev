import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';

type FaqItem = { question: string; answer: string };

export function FAQSection() {
  const { t } = useTranslation('commerce');
  const items = t('subscribe.faqSection.items', { returnObjects: true }) as FaqItem[];

  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">{t('subscribe.faqSection.label')}</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {t('subscribe.faqSection.title')}
        </h2>
      </div>

      <div className="relative z-10 mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {items.map((item) => (
            <AccordionItem
              key={item.question}
              value={item.question}
              className="border-b border-neutral-200 last:border-0"
            >
              <AccordionTrigger className="py-5 text-start text-base font-medium text-neutral-900 hover:no-underline hover:text-[#05ef62] transition-colors [&[data-state=open]]:text-[#05ef62]">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm text-neutral-600 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
