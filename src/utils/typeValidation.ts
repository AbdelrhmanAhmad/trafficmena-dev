/**
 * Type validation utilities for safe runtime type casting
 * Provides type guards and validation functions to prevent runtime type errors
 */

/**
 * Type guard to check if a value is an array
 */
export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * Type guard to check if a value is a valid array and not null/undefined
 */
export const isSafeArray = (value: unknown): value is unknown[] => {
  return value != null && Array.isArray(value);
};

/**
 * Type guard to check if a value is a non-null object
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value != null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Type guard to check if a value is a string
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard to check if a value is a number
 */
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !Number.isNaN(value);
};

/**
 * Type guard to check if a value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

/**
 * Safe casting utility that validates data before casting
 */
export const SafeCast = {
  /**
   * Safely cast data to an array with validation
   * @param data - The data to cast
   * @param fallback - Fallback value if casting fails
   * @returns Validated array or fallback
   */
  toArray<T>(data: unknown, fallback: T[] = []): T[] {
    if (isSafeArray(data)) {
      return data as T[];
    }
    console.warn('SafeCast.toArray: Invalid array data, using fallback:', {
      data,
      fallback,
    });
    return fallback;
  },

  /**
   * Safely cast data to an object with validation
   * @param data - The data to cast
   * @param fallback - Fallback value if casting fails
   * @returns Validated object or fallback
   */
  toObject<T extends Record<string, unknown>>(data: unknown, fallback: T = {} as T): T {
    if (isObject(data)) {
      return data as T;
    }
    console.warn('SafeCast.toObject: Invalid object data, using fallback:', {
      data,
      fallback,
    });
    return fallback;
  },

  /**
   * Safely cast data to a string with validation
   * @param data - The data to cast
   * @param fallback - Fallback value if casting fails
   * @returns Validated string or fallback
   */
  toString(data: unknown, fallback: string = ''): string {
    if (isString(data)) {
      return data;
    }
    if (data != null && (isNumber(data) || isBoolean(data))) {
      return String(data);
    }
    console.warn('SafeCast.toString: Invalid string data, using fallback:', {
      data,
      fallback,
    });
    return fallback;
  },

  /**
   * Safely cast data to a number with validation
   * @param data - The data to cast
   * @param fallback - Fallback value if casting fails
   * @returns Validated number or fallback
   */
  toNumber(data: unknown, fallback: number = 0): number {
    if (isNumber(data)) {
      return data;
    }
    if (isString(data)) {
      const parsed = Number(data);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    console.warn('SafeCast.toNumber: Invalid number data, using fallback:', {
      data,
      fallback,
    });
    return fallback;
  },

  /**
   * Safely cast data to a boolean with validation
   * @param data - The data to cast
   * @param fallback - Fallback value if casting fails
   * @returns Validated boolean or fallback
   */
  toBoolean(data: unknown, fallback: boolean = false): boolean {
    if (isBoolean(data)) {
      return data;
    }
    if (isString(data)) {
      return data.toLowerCase() === 'true';
    }
    if (isNumber(data)) {
      return data !== 0;
    }
    console.warn('SafeCast.toBoolean: Invalid boolean data, using fallback:', {
      data,
      fallback,
    });
    return fallback;
  },
} as const;

/**
 * Specific validation functions for API responses
 */
export const ApiResponseValidator = {
  /**
   * Validate user list item structure
   */
  validateUserListItem(item: unknown): item is Record<string, unknown> {
    if (!isObject(item)) return false;

    const requiredFields = ['id'];
    return requiredFields.every((field) => field in item);
  },

  /**
   * Validate user skills item structure
   */
  validateUserSkillItem(item: unknown): item is Record<string, unknown> {
    if (!isObject(item)) return false;

    // Basic structure validation - can be extended as needed
    return 'skill' in item || 'skills' in item;
  },
} as const;

/**
 * Safe mapper utility for transforming API response arrays
 */
export const SafeMapper = {
  /**
   * Safely map array data with validation
   * @param data - Raw API response data
   * @param mapper - Function to transform each valid item
   * @param validator - Optional validator function
   * @returns Mapped array with only valid items
   */
  mapArray<T, R>(
    data: unknown,
    mapper: (item: T) => R,
    validator?: (item: unknown) => item is T,
  ): R[] {
    const safeArray = SafeCast.toArray(data);

    if (!safeArray.length) {
      return [];
    }

    const results: R[] = [];

    for (const item of safeArray) {
      try {
        if (validator && !validator(item)) {
          console.warn('SafeMapper.mapArray: Invalid item skipped:', item);
          continue;
        }

        const mapped = mapper(item as T);
        results.push(mapped);
      } catch (error) {
        console.error('SafeMapper.mapArray: Error mapping item:', {
          item,
          error,
        });
      }
    }

    return results;
  },
} as const;

/**
 * Utility to safely extract nested properties from objects
 */
export const safeGet = <T>(obj: unknown, path: string, fallback?: T): T | undefined => {
  if (!isObject(obj)) {
    return fallback;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
};
