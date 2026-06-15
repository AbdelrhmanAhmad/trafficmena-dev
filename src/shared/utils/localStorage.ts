/**
 * Bug #12 Fix: Safe localStorage operations with comprehensive error handling
 * Handles various browser scenarios including incognito mode, storage disabled,
 * quota exceeded, and other edge cases.
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely checks if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely sets an item in localStorage
 */
export function setLocalStorageItem<T>(key: string, value: T): StorageResult<void> {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        error: 'LocalStorage is not available (may be disabled or in private mode)',
      };
    }

    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);

    return { success: true };
  } catch (error) {
    let errorMessage = 'Unknown error occurred while saving data';

    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        errorMessage = 'Storage quota exceeded. Please clear some browser data.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Storage access denied. This may occur in private browsing mode.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Safely gets an item from localStorage
 */
export function getLocalStorageItem<T>(key: string, defaultValue?: T): StorageResult<T> {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        data: defaultValue,
        error: 'LocalStorage is not available',
      };
    }

    const item = localStorage.getItem(key);

    if (item === null) {
      return {
        success: true,
        data: defaultValue,
      };
    }

    const parsedValue = JSON.parse(item) as T;
    return {
      success: true,
      data: parsedValue,
    };
  } catch (error) {
    let errorMessage = 'Error reading stored data';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      data: defaultValue,
      error: errorMessage,
    };
  }
}

/**
 * Safely removes an item from localStorage
 */
export function removeLocalStorageItem(key: string): StorageResult<void> {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        error: 'LocalStorage is not available',
      };
    }

    localStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    let errorMessage = 'Error removing stored data';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Safely clears all localStorage items (use with caution)
 */
export function clearLocalStorage(): StorageResult<void> {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        error: 'LocalStorage is not available',
      };
    }

    localStorage.clear();
    return { success: true };
  } catch (error) {
    let errorMessage = 'Error clearing stored data';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
