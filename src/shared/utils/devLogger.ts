/**
 * Development Logger Utility
 *
 * Provides safe logging methods that only output in development mode.
 * This prevents debug information from leaking to production builds.
 *
 * Usage:
 * ```ts
 * import { devLogger } from '@/shared/utils/devLogger';
 *
 * devLogger.log('Debug info:', data);
 * devLogger.warn('Warning message:', warning);
 * devLogger.error('Error occurred:', error);
 * ```
 */

class DevLogger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log debug information (development only)
   */
  log(...args: any[]) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Log warning information (development only)
   */
  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * Log error information (always logs for debugging)
   */
  error(...args: any[]) {
    console.error(...args);
  }

  /**
   * Log group start (development only)
   */
  group(label?: string) {
    if (this.isDevelopment && console.group) {
      console.group(label);
    }
  }

  /**
   * Log group end (development only)
   */
  groupEnd() {
    if (this.isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Log table data (development only)
   */
  table(data: any) {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Start performance timing (development only)
   */
  time(label: string) {
    if (this.isDevelopment && console.time) {
      console.time(label);
    }
  }

  /**
   * End performance timing (development only)
   */
  timeEnd(label: string) {
    if (this.isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

export const devLogger = new DevLogger();

// Legacy support for existing code patterns
export const createDevLogger = (prefix?: string) => ({
  log: (...args: any[]) => devLogger.log(prefix ? `[${prefix}]` : '', ...args),
  warn: (...args: any[]) => devLogger.warn(prefix ? `[${prefix}]` : '', ...args),
  error: (...args: any[]) => devLogger.error(prefix ? `[${prefix}]` : '', ...args),
});
