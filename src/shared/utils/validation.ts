/**
 * Bug #11 Fix: Server-side validation utilities for form data
 * This module provides comprehensive validation for all user inputs
 * before they are sent to the database.
 */

// Form validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Sanitizes text input by trimming whitespace and removing potentially harmful characters
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';

  const trimmed = input.trim();
  let result = '';

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const code = char.charCodeAt(0);

    const isControl = (code >= 0 && code <= 31) || code === 127 || (code >= 128 && code <= 159);
    if (!isControl) {
      result += char;
    }
  }

  return result;
}

/**
 * Validates meetup form data with comprehensive server-side rules
 */
export function validateEventData(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required' });
  } else {
    const sanitizedTitle = sanitizeText(data.title);
    if (sanitizedTitle.length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (sanitizedTitle.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must not exceed 200 characters',
      });
    }
  }

  // Date validation
  if (!data.date) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else {
    const dateValue =
      typeof data.date === 'string' || typeof data.date === 'number'
        ? data.date
        : String(data.date);
    const eventDate = new Date(dateValue);
    const now = new Date();
    if (Number.isNaN(eventDate.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date format' });
    } else if (eventDate <= now) {
      errors.push({ field: 'date', message: 'Date must be in the future' });
    }
  }

  // Optional field validations
  if (data.description && typeof data.description === 'string') {
    if (sanitizeText(data.description).length > 1000) {
      errors.push({
        field: 'description',
        message: 'Description must not exceed 1000 characters',
      });
    }
  }

  if (data.location && typeof data.location === 'string') {
    if (sanitizeText(data.location).length > 300) {
      errors.push({
        field: 'location',
        message: 'Location must not exceed 300 characters',
      });
    }
  }

  if (data.max_attendees !== null && data.max_attendees !== undefined) {
    const attendees = Number(data.max_attendees);
    if (Number.isNaN(attendees) || attendees <= 0) {
      errors.push({
        field: 'max_attendees',
        message: 'Max attendees must be a positive number',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates library asset form data
 */
export function validateLibraryAssetData(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required' });
  } else {
    const sanitizedTitle = sanitizeText(data.title);
    if (sanitizedTitle.length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (sanitizedTitle.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must not exceed 200 characters',
      });
    }
  }

  // Optional field validations
  if (data.description && typeof data.description === 'string') {
    if (sanitizeText(data.description).length > 1000) {
      errors.push({
        field: 'description',
        message: 'Description must not exceed 1000 characters',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
