import type { CreateEventPayload } from '@/app/api/events';
import type { EventDetailRecord } from '@/app/api/events';

/** Initial expert IDs from an event detail record (normalized relations). */
export function resolveInitialExpertIds(event?: Pick<EventDetailRecord, 'expert_ids'>): string[] {
  return event?.expert_ids ? [...event.expert_ids] : [];
}

/** Merge selected expert profile IDs into an event create/update payload. */
export function withEventExpertIds(
  payload: CreateEventPayload,
  selectedExpertIds: string[],
): CreateEventPayload {
  return {
    ...payload,
    expertIds: selectedExpertIds,
  };
}

export function toggleExpertSelection(selectedIds: string[], expertId: string, checked: boolean): string[] {
  if (checked) {
    return selectedIds.includes(expertId) ? selectedIds : [...selectedIds, expertId];
  }
  return selectedIds.filter((id) => id !== expertId);
}

export function filterExpertsBySearch<T extends { displayNameEn: string; displayNameAr?: string; headlineEn?: string | null }>(
  experts: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return experts;
  return experts.filter((expert) => {
    const haystack = [expert.displayNameEn, expert.displayNameAr ?? '', expert.headlineEn ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
