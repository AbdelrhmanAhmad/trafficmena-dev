import { format } from 'date-fns';
import { CalendarDays, Clock, MapPin, MoreHorizontal, Users } from 'lucide-react';
import { useState } from 'react';
import type { Event } from '@/features/events/types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

interface EventCardProps {
  event: Event;
  attendeeCount?: number;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onViewDetails?: (event: Event) => void;
  onViewAttendees?: (event: Event) => void;
}

export function EventCard({
  event,
  attendeeCount = 0,
  onEdit,
  onDelete,
  onViewDetails,
  onViewAttendees,
}: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  const isUpcoming = new Date(event.date) > new Date();

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'Meetup':
        return 'bg-blue-100 text-blue-800';
      case 'Event':
        return 'bg-green-100 text-green-800';
      case 'Mastermind':
        return 'bg-purple-100 text-purple-800';
      case 'Retreat':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(event);
    }
  };

  return (
    <Card
      className="flex h-full cursor-pointer flex-col transition-shadow hover:shadow-lg"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={isUpcoming ? 'default' : 'secondary'}>
                {isUpcoming ? 'Upcoming' : 'Past'}
              </Badge>
              <Badge className={getEventTypeColor(event.event_type)}>{event.event_type}</Badge>
              {event.tags && event.tags.length > 0 && (
                <Badge variant="outline">{event.tags[0]}</Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2 text-lg">{event.title}</CardTitle>
          </div>
          {(onEdit || onDelete || onViewDetails || onViewAttendees) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(event);
                    }}
                  >
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(event);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(event);
                    }}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between">
        <div className="space-y-3">
          {event.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(event.date)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatTime(event.date)}</span>
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {attendeeCount} registered
                {event.max_attendees && ` / ${event.max_attendees} max`}
              </span>
            </div>
          </div>
        </div>

        {event.guest_experts &&
          Array.isArray(event.guest_experts) &&
          event.guest_experts.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                You'll learn from{' '}
                <span className="font-medium">
                  {event.guest_experts.length === 1
                    ? event.guest_experts[0].name
                    : `${event.guest_experts[0].name} ${event.guest_experts.length > 1 ? `+${event.guest_experts.length - 1} more` : ''}`}
                </span>
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
