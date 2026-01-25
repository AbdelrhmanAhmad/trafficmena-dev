import { Calendar, Clock, Heart, MapPin, Mic, Users } from 'lucide-react';
import { memo, useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '@/features/events/types';
import { cn } from '@/shared/lib/utils';
import { stripHtmlTags } from '@/shared/utils/inputSanitization';

interface EventCardProps {
  event: Event;
  to?: string;
  className?: string;
  showFavoriteButton?: boolean;
  onFavoriteToggle?: (event: Event) => void;
  onViewDetails?: (event: Event) => void;
}

export const EventCard = memo(function EventCard({
  event,
  to,
  className,
  showFavoriteButton = false,
  onFavoriteToggle,
  onViewDetails,
}: EventCardProps) {
  const destination = to ?? `/meetups/${event.id}`;
  const { formattedDate, formattedTime, isUpcoming } = useMemo(() => {
    const eventDate = new Date(event.date);
    return {
      formattedDate: eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      formattedTime: eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isUpcoming: eventDate.getTime() > Date.now(),
    };
  }, [event.date]);

  const imageUrl =
    event.image_url ??
    'https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?q=80&w=1200&auto=format&fit=crop';

  const primaryTag = event.tags?.[0];
  const descriptionPreview = useMemo(() => {
    if (!event.description) return undefined;
    return stripHtmlTags(event.description).slice(0, 110);
  }, [event.description]);

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm">
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
              {attendeeCount} RSVPs
              {typeof maxAttendees === 'number' && maxAttendees > 0 && ` / ${maxAttendees}`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {(event as { duration?: string }).duration ?? '90 min'}
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
