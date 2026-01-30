import { cn } from '@/shared/lib/utils';
import { TESTIMONIALS } from '../content';

interface TestimonialsSectionProps {
  isLoaded?: boolean;
}

export function TestimonialsSection({ isLoaded = true }: TestimonialsSectionProps) {
  return (
    <section
      className={cn(
        'relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8 content-visibility-auto',
        isLoaded && 'animate-fade-in',
      )}
    >
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute left-0 right-0 top-1/4 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
        <div className="absolute left-0 right-0 top-3/4 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">Testimonials</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          What Our Members Say
        </h2>
      </div>

      {/* Desktop: 4 cards, Mobile: 3 cards (4th hidden) */}
      <div className="relative z-10 mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((testimonial, index) => (
          <div
            key={testimonial.name}
            className={cn(
              'rounded-2xl border border-neutral-200 bg-white/80 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
              index === 3 && 'hidden lg:block',
            )}
          >
            <div className="mb-4 aspect-square overflow-hidden rounded-xl bg-neutral-100">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-sm italic text-neutral-600">"{testimonial.quote}"</p>
            <div className="mt-3">
              <p className="font-medium text-neutral-900">{testimonial.name}</p>
              <p className="text-xs text-neutral-500">{testimonial.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
