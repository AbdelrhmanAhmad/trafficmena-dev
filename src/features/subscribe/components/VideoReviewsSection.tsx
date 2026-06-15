import { useEffect, useRef, useState } from 'react';
import VideoEmbed from '@/shared/components/VideoEmbed';
import { cn } from '@/shared/lib/utils';
import { VIDEO_REVIEWS } from '../content';

interface VideoReviewsSectionProps {
  isLoaded?: boolean;
}

export function VideoReviewsSection({ isLoaded = true }: VideoReviewsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(4);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => {
            const newCount = Math.min(prev + 4, VIDEO_REVIEWS.length);
            if (newCount >= VIDEO_REVIEWS.length) {
              observer.disconnect();
            }
            return newCount;
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, []);

  const visibleVideos = VIDEO_REVIEWS.slice(0, visibleCount);

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
        <span className="text-sm font-normal text-neutral-500">Reviews</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          What Our Members Say
        </h2>
      </div>

      {/* Video Grid: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="relative z-10 mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleVideos.map((videoUrl) => (
          <div
            key={videoUrl}
            className="rounded-2xl border border-neutral-200 bg-white/80 p-3 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <VideoEmbed url={videoUrl} className="overflow-hidden rounded-xl" />
          </div>
        ))}
      </div>

      {/* Invisible trigger for loading more videos */}
      {visibleCount < VIDEO_REVIEWS.length && (
        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
      )}
    </section>
  );
}
