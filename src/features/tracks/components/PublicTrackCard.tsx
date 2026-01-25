import { format } from 'date-fns';
import { BookOpen, Calendar, Users } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';
import type { PublicTrackRecord } from '@/app/api/tracks';
import { cn } from '@/shared/lib/utils';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';

interface PublicTrackCardProps {
  track: PublicTrackRecord;
  to?: string;
  className?: string;
  onClick?: () => void;
}

export function PublicTrackCard({ track, to, className, onClick }: PublicTrackCardProps) {
  const destination = to ?? `/tracks/${track.id}`;

  const formattedDate = track.first_event_date
    ? format(track.first_event_date, 'MMM d, yyyy')
    : null;

  const imageUrl =
    track.image_url ??
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop';

  const descriptionPreview = track.description
    ? stripHtmlTags(track.description).slice(0, 110)
    : undefined;

  // Check if booking is open
  const now = new Date();
  const isBookingOpen =
    track.track_booking_start &&
    track.track_booking_end &&
    now >= track.track_booking_start &&
    now <= track.track_booking_end;

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link to={destination} onClick={handleCardClick} className={cn('group block', className)}>
      <article className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative">
          <div className="relative aspect-[300/160] w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={track.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm">
            <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              Track
            </span>
            <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
              {track.event_count} {track.event_count === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
          {isBookingOpen && track.spots_remaining !== null && (
            <div className="absolute top-3 right-3">
              <span className="rounded-full bg-green-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                {track.spots_remaining} spots left
              </span>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold tracking-tight text-neutral-900">
                {track.title}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                <BookOpen className="h-3 w-3" />
                <span>
                  {track.event_count} {track.event_count === 1 ? 'event' : 'events'} included
                </span>
              </p>
            </div>
            {formattedDate && (
              <div className="text-right text-xs text-neutral-500">
                <div className="flex items-center justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Starts
                </div>
                <div>{formattedDate}</div>
              </div>
            )}
          </div>
          {descriptionPreview && (
            <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{descriptionPreview}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {track.spots_remaining !== null
                ? `${track.spots_remaining} spots available`
                : 'Open enrollment'}
            </span>
            {isBookingOpen && (
              <span className="ml-auto rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-3 py-1 text-xs font-medium text-[#101010]">
                Book Now
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
