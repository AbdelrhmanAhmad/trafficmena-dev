import { useTranslation } from 'react-i18next';
import { getSubscribeIcon } from '../subscribeIcons';

type Differentiator = {
  icon: string;
  title: string;
  description: string;
};

export function DifferentiationSection() {
  const { t } = useTranslation('commerce');
  const items = t('subscribe.differentiationSection.items', {
    returnObjects: true,
  }) as Differentiator[];

  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">
          {t('subscribe.differentiationSection.label')}
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {t('subscribe.differentiationSection.title')}
        </h2>
      </div>

      <div className="relative z-10 mt-10 grid gap-6 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = getSubscribeIcon(item.icon);
          return (
            <div
              key={item.title}
              className="group rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#05ef62] to-[#29cf9f] text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
