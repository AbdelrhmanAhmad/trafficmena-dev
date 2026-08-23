import { z } from 'zod';

// New events default to draft (false). Update is plain-optional so omitting isPublished leaves the
// event's published state untouched — it must never silently unpublish a live event on edit.
export const createEventIsPublishedSchema = z.boolean().default(false);
export const updateEventIsPublishedSchema = z.boolean().optional();
