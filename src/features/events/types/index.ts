import type { EventDetailRecord, EventRecord } from '@/app/api/events';

export type Event = EventRecord;
export type EventDetail = EventDetailRecord;

export type EventFilters = {
  search_query?: string;
  event_type?: EventRecord['event_type'];
  upcoming_only?: boolean;
};

export interface BookingRequest {
  event_id: string;
}

export interface BookingResponse {
  success: boolean;
  message?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
