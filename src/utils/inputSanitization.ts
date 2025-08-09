// Input sanitization and validation utilities for security

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Validates and sanitizes skill names to prevent XSS and ensure data quality
 */
export const validateAndSanitizeSkillName = (input: string): ValidationResult => {
  // Basic validation
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Skill name is required' };
  }

  const trimmed = input.trim();
  
  // Length validation
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Skill name must be at least 2 characters long' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Skill name must be 50 characters or less' };
  }

  // Check for malicious patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  if (maliciousPatterns.some(pattern => pattern.test(trimmed))) {
    return { isValid: false, error: 'Skill name contains invalid characters' };
  }

  // Remove potentially dangerous characters while preserving most valid characters
  // Allow letters, numbers, spaces, hyphens, dots, parentheses, and common symbols
  const sanitized = trimmed.replace(/[<>'"&`]/g, '').replace(/\s+/g, ' ').trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Skill name cannot be empty after removing invalid characters' };
  }

  // Check for SQL injection patterns (though Supabase handles this, extra protection)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /[';]--/,
    /\/\*[\s\S]*?\*\//
  ];

  if (sqlPatterns.some(pattern => pattern.test(sanitized))) {
    return { isValid: false, error: 'Skill name contains invalid content' };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitized 
  };
};

/**
 * Generic text sanitization for user inputs
 */
export const sanitizeText = (input: string, maxLength: number = 1000): ValidationResult => {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input is required' };
  }

  const trimmed = input.trim();
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Input must be ${maxLength} characters or less` };
  }

  // Remove script tags and dangerous HTML
  const sanitized = trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  return { 
    isValid: true, 
    sanitizedValue: sanitized 
  };
};