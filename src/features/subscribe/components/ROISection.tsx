import { ROI_SCENARIOS } from '../content';

export function ROISection() {
  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">Return on Investment</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          The Real Question: What's NOT Investing Worth?
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          The real cost isn't the subscription. It's 12 months of staying exactly where you are.
        </p>
      </div>

      <div className="relative z-10 mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ROI_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <div
              key={scenario.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#05ef62]/20 to-[#29cf9f]/10">
                  <Icon className="h-6 w-6 text-[#05ef62]" />
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                  {scenario.metric}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{scenario.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{scenario.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
