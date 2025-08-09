import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Users, Clock, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';

type Event = Tables<'events'>;

interface EventCardProps {
  event: Event;
  attendeeCount?: number;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onViewDetails?: (event: Event) => void;
}

export function EventCard({ event, attendeeCount = 0, onEdit, onDelete, onViewDetails }: EventCardProps) {
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
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isUpcoming ? "default" : "secondary"}>
                {isUpcoming ? "Upcoming" : "Past"}
              </Badge>
              <Badge className={getEventTypeColor(event.event_type)}>
                {event.event_type}
              </Badge>
              {event.tags && event.tags.length > 0 && (
                <Badge variant="outline">
                  {event.tags[0]}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-2">
              {event.title}
            </CardTitle>
          </div>
          {(onEdit || onDelete || onViewDetails) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(event);
                  }}>
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(event);
                  }}>
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
      
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
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
        
        {event.host_name && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Hosted by <span className="font-medium">{event.host_name}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}