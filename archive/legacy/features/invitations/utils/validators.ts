import { supabase } from '@/shared/integrations/supabase/client';
import type { ServiceResponse } from '../types';

/**
 * CSV Validation Utilities
 * Handles email validation, duplicate checking, and data sanitization
 */

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email format using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim().toLowerCase();

  // Basic checks
  if (trimmed.length === 0 || trimmed.length > 320) {
    return false;
  }

  // Check for common invalid patterns
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return false;
  }

  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * CSV row validation result
 */
export interface CSVRowValidationResult extends ValidationResult {
  rowNumber: number;
  email?: string;
  sanitizedData?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Bulk email validation result
 */
export interface BulkValidationResult extends ValidationResult {
  validEmails: string[];
  duplicates: string[];
  existingUsers: string[];
  pendingInvitations: string[];
  invalidEmails: Array<{ email: string; reason: string }>;
}

/**
 * Validate bulk emails for duplicates and existing users/invitations
 */
export async function validateBulkEmails(
  emails: string[],
): Promise<ServiceResponse<BulkValidationResult>> {
  try {
    const validEmails: string[] = [];
    const duplicates: string[] = [];
    const invalidEmails: Array<{ email: string; reason: string }> = [];
    const emailSet = new Set<string>();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for valid format and internal duplicates
    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();

      if (!validateEmail(trimmed)) {
        invalidEmails.push({ email, reason: 'Invalid email format' });
        continue;
      }

      if (emailSet.has(trimmed)) {
        duplicates.push(trimmed);
        continue;
      }

      emailSet.add(trimmed);
      validEmails.push(trimmed);
    }

    // Check against existing users
    const existingUsersResult = await checkExistingUsers(validEmails);
    if (!existingUsersResult.success) {
      return {
        success: false,
        error: existingUsersResult.error,
      };
    }

    // Check against pending invitations
    const pendingInvitationsResult = await checkExistingInvitations(validEmails);
    if (!pendingInvitationsResult.success) {
      return {
        success: false,
        error: pendingInvitationsResult.error,
      };
    }

    const existingUsers = existingUsersResult.data || [];
    const pendingInvitations = pendingInvitationsResult.data || [];

    // Add warnings for existing users and pending invitations
    if (existingUsers.length > 0) {
      warnings.push(`${existingUsers.length} email(s) already belong to registered users`);
    }

    if (pendingInvitations.length > 0) {
      warnings.push(`${pendingInvitations.length} email(s) already have pending invitations`);
    }

    if (duplicates.length > 0) {
      warnings.push(`${duplicates.length} duplicate email(s) found in upload`);
    }

    if (invalidEmails.length > 0) {
      errors.push(`${invalidEmails.length} invalid email address(es) found`);
    }

    const finalValidEmails = validEmails.filter(
      (email) => !existingUsers.includes(email) && !pendingInvitations.includes(email),
    );

    return {
      success: true,
      data: {
        isValid: finalValidEmails.length > 0,
        errors,
        warnings,
        validEmails: finalValidEmails,
        duplicates,
        existingUsers,
        pendingInvitations,
        invalidEmails,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Sanitize CSV data by trimming whitespace and normalizing values
 */
export function sanitizeCSVData(data: Record<string, any>[]): Record<string, any>[] {
  return data.map((row) => {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        // Trim whitespace and normalize empty strings to null
        const trimmed = value.trim();
        sanitized[key.toLowerCase().trim()] = trimmed === '' ? null : trimmed;
      } else {
        sanitized[key.toLowerCase().trim()] = value;
      }
    }

    return sanitized;
  });
}

/**
 * Check for existing users in the profiles table
 */
export async function checkExistingUsers(emails: string[]): Promise<ServiceResponse<string[]>> {
  try {
    if (emails.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase.from('profiles').select('email').in('email', emails);

    if (error) {
      return {
        success: false,
        error: `Failed to check existing users: ${error.message}`,
      };
    }

    return {
      success: true,
      data: data?.map((user) => user.email) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check existing users',
    };
  }
}

/**
 * Check for existing pending invitations
 */
export async function checkExistingInvitations(
  emails: string[],
): Promise<ServiceResponse<string[]>> {
  try {
    if (emails.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('invitations')
      .select('email')
      .in('email', emails)
      .in('status', ['pending', 'sent']);

    if (error) {
      return {
        success: false,
        error: `Failed to check existing invitations: ${error.message}`,
      };
    }

    return {
      success: true,
      data: data?.map((invitation) => invitation.email) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check existing invitations',
    };
  }
}

/**
 * Validate a single CSV row
 */
export function validateCSVRow(
  row: Record<string, any>,
  rowNumber: number,
  requiredFields: string[] = ['email'],
): CSVRowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  for (const field of requiredFields) {
    if (!row[field] || (typeof row[field] === 'string' && row[field].trim() === '')) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate email if present
  if (row.email) {
    const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
    if (!validateEmail(email)) {
      errors.push('Invalid email format');
    } else {
      // Prepare sanitized data
      const sanitizedData = {
        email,
        first_name:
          row.first_name && typeof row.first_name === 'string' ? row.first_name.trim() : undefined,
        last_name:
          row.last_name && typeof row.last_name === 'string' ? row.last_name.trim() : undefined,
      };

      // Clean up undefined values
      if (!sanitizedData.first_name) delete sanitizedData.first_name;
      if (!sanitizedData.last_name) delete sanitizedData.last_name;

      return {
        rowNumber,
        isValid: errors.length === 0,
        errors,
        warnings,
        email,
        sanitizedData,
      };
    }
  }

  return {
    rowNumber,
    isValid: false,
    errors,
    warnings,
  };
}

/**
 * Normalize CSV headers to match expected format
 */
export function normalizeCSVHeaders(headers: string[]): string[] {
  const headerMap: Record<string, string> = {
    email: 'email',
    email_address: 'email',
    'e-mail': 'email',
    mail: 'email',
    'first name': 'first_name',
    firstname: 'first_name',
    first_name: 'first_name',
    fname: 'first_name',
    given_name: 'first_name',
    'last name': 'last_name',
    lastname: 'last_name',
    last_name: 'last_name',
    lname: 'last_name',
    surname: 'last_name',
    family_name: 'last_name',
  };

  return headers.map((header) => {
    const normalized = header.toLowerCase().trim();
    return headerMap[normalized] || normalized;
  });
}

/**
 * Validate CSV structure and headers
 */
export interface CSVStructureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedHeaders: string[];
  hasRequiredFields: boolean;
}

export function validateCSVStructure(headers: string[]): CSVStructureValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!headers || headers.length === 0) {
    errors.push('CSV file appears to be empty or has no headers');
    return {
      isValid: false,
      errors,
      warnings,
      normalizedHeaders: [],
      hasRequiredFields: false,
    };
  }

  const normalizedHeaders = normalizeCSVHeaders(headers);
  const hasEmail = normalizedHeaders.includes('email');

  if (!hasEmail) {
    errors.push('CSV file must contain an "email" column (or similar: email_address, e-mail)');
  }

  // Check for duplicate headers
  const headerSet = new Set();
  const duplicates: string[] = [];

  for (const header of normalizedHeaders) {
    if (headerSet.has(header)) {
      duplicates.push(header);
    } else {
      headerSet.add(header);
    }
  }

  if (duplicates.length > 0) {
    errors.push(`Duplicate column headers found: ${duplicates.join(', ')}`);
  }

  // Warnings for recommended fields
  if (!normalizedHeaders.includes('first_name') && !normalizedHeaders.includes('last_name')) {
    warnings.push(
      'Consider including first_name and/or last_name columns for personalized invitations',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedHeaders,
    hasRequiredFields: hasEmail,
  };
}
