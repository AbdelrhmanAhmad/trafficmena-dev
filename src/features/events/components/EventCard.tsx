import { Calendar, Clock, Heart, MapPin, Mic, Users } from 'lucide-react';
import type React from 'react';
import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '@/features/events/types';
import { cn } from '@/shared/lib/utils';
import { isUpcoming as checkUpcoming, formatCardDate, formatTime } from '@/shared/utils/dateUtils';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';

interface EventCardProps {
  event: Event;
  to?: string;
  className?: string;
  showFavoriteButton?: boolean;
  onFavoriteToggle?: (event: Event) => void;
  onCardClick?: (event: Event) => void;
  onViewDetails?: (event: Event) => void;
}

export const EventCard = memo(function EventCard({
  event,
  to,
  className,
  showFavoriteButton = false,
  onFavoriteToggle,
  onCardClick,
  onViewDetails,
}: EventCardProps) {
  const destination = to ?? `/meetups/${event.id}`;
  const { formattedDate, formattedTime, isUpcoming } = useMemo(() => {
    return {
      formattedDate: formatCardDate(event.date),
      formattedTime: formatTime(event.date),
      isUpcoming: checkUpcoming(event.date),
    };
  }, [event.date]);

  const imageUrl = event.image_url ?? '/uploads/trafficmena-event.png';

  const primaryTag = event.tags?.[0];
  const descriptionPreview = useMemo(() => {
    if (!event.description) return undefined;
    return stripHtmlTags(event.description).slice(0, 110);
  }, [event.description]);

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onCardClick?.(event);

    if (onViewDetails) {
      e.preventDefault();
      onViewDetails(event);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(event);
  };

  const attendeeCount = event.attendee_count ?? 0;
  const maxAttendees = event.max_attendees ?? undefined;

  return (
    <Link to={destination} onClick={handleCardClick} className={cn('group block', className)}>
      <article className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative">
          <div className="relative aspect-[300/160] w-full overflow-hidden">
            <img
              src={imageUrl}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          </div>
          {showFavoriteButton && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
            >
              <Heart className="h-4 w-4 text-neutral-700" />
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-800">
            <span className="rounded-full bg-gradient-to-r from-[#05ef62] to-[#29cf9f] px-2 py-0.5 text-[10px] font-semibold text-[#101010]">
              {isUpcoming ? 'Upcoming' : 'Past'}
            </span>
            <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
              {event.event_type}
            </span>
            {primaryTag && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                {primaryTag}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold tracking-tight text-neutral-900">
                {event.title}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{event.location ?? 'Online'}</span>
              </p>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </div>
              <div>{formattedTime}</div>
            </div>
          </div>
          {descriptionPreview && (
            <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{descriptionPreview}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {maxAttendees && attendeeCount >= maxAttendees ? 'Sold Out' : 'Limited Spots'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              90 min
            </span>
            <span className="flex items-center gap-1">
              <Mic className="h-4 w-4" />
              {event.event_type}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});
