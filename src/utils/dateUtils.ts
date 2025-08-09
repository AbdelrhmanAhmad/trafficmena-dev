import { format } from 'date-fns';

/**
 * Centralized date formatting utilities to ensure consistency across the app
 */

export const formatMeetupDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMMM d, yyyy • h:mm a');
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

export const formatTime = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'h:mm a');
  } catch {
    return dateString;
  }
};

export const formatDateWithDay = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateString;
  }
};

export const isUpcoming = (dateString: string): boolean => {
  try {
    return new Date(dateString) > new Date();
  } catch {
    return false;
  }
};

export const isPast = (dateString: string): boolean => {
  try {
    return new Date(dateString) < new Date();
  } catch {
    return false;
  }
};