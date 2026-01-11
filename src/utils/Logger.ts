/**
 * Logger conditionnel pour le développement
 * Désactivé en production pour les performances
 */
const IS_DEV = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export class Logger {
  /**
   * Log a debug message (only in development)
   */
  static log(message: string, ...args: unknown[]): void {
    if (IS_DEV) {
      console.log(message, ...args);
    }
  }
  
  /**
   * Log a warning message (only in development)
   */
  static warn(message: string, ...args: unknown[]): void {
    if (IS_DEV) {
      console.warn(message, ...args);
    }
  }
  
  /**
   * Log an error message (always logged, even in production)
   */
  static error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }
}
