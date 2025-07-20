// Comprehensive error handling utilities for consistent error management

// Dynamic import for toast to support testing
const getToast = async () => {
  try {
    const { toast } = await import('@/hooks/use-toast');
    return toast;
  } catch (error) {
    // Fallback for testing environment
    return () => {};
  }
};

// Dynamic imports for monitoring services to avoid circular dependencies
const getErrorTracker = async () => {
  try {
    const { default: errorTracker } = await import('./error-tracker');
    return errorTracker;
  } catch (error) {
    return null;
  }
};

const getLogger = async () => {
  try {
    const { default: logger } = await import('./logger');
    return logger;
  } catch (error) {
    return null;
  }
};

export interface ErrorDetails {
  message: string;
  code?: string;
  retryable: boolean;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    retryable: boolean = false,
    userMessage?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = retryable;
    this.userMessage = userMessage || this.getUserFriendlyMessage(message, code);
    this.severity = severity;
    this.originalError = originalError;
  }

  private getUserFriendlyMessage(message: string, code: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Network-related errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || code.includes('NETWORK')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    // Authentication errors
    if (lowerMessage.includes('auth') || lowerMessage.includes('permission') || code.includes('AUTH')) {
      return 'Authentication error. Please refresh the page and sign in again.';
    }
    
    // Rate limiting / quota errors
    if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || code.includes('QUOTA')) {
      return 'Service temporarily unavailable due to high demand. Please try again in a few minutes.';
    }
    
    // Timeout errors
    if (lowerMessage.includes('timeout') || code.includes('TIMEOUT')) {
      return 'The request timed out. Please try again.';
    }
    
    // File processing errors
    if (lowerMessage.includes('file') || code.includes('FILE')) {
      return 'File processing error. Please check your file and try again.';
    }
    
    // Database errors
    if (lowerMessage.includes('database') || lowerMessage.includes('firestore') || code.includes('DB')) {
      return 'Database error. Please try again or contact support if the issue persists.';
    }
    
    // AI processing errors
    if (lowerMessage.includes('ai') || lowerMessage.includes('gemini') || code.includes('AI')) {
      return 'AI processing error. Please try again or contact support if the issue persists.';
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the problem continues.';
  }
}

export class ErrorHandler {
  /**
   * Normalize any error into an AppError
   */
  static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new AppError(
        error.message,
        this.getErrorCode(error),
        this.isRetryable(error),
        undefined,
        this.getErrorSeverity(error),
        error
      );
    }
    
    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new AppError(message, 'UNKNOWN_ERROR', false, undefined, 'medium');
  }

  /**
   * Get error code from various error types
   */
  static getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Firebase errors
    if ('code' in error && typeof error.code === 'string') {
      const firebaseCode = error.code.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      // Map Firebase codes to our standard codes
      if (firebaseCode === 'PERMISSION_DENIED') return 'PERMISSION_DENIED';
      if (firebaseCode === 'UNAVAILABLE') return 'NETWORK_ERROR';
      return firebaseCode;
    }
    
    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('permission')) {
      return 'PERMISSION_DENIED';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Determine if an error is retryable
   */
  static isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const code = this.getErrorCode(error);
    
    // Non-retryable errors
    const nonRetryableCodes = [
      'PERMISSION_DENIED',
      'NOT_FOUND',
      'INVALID_ARGUMENT',
      'UNAUTHENTICATED',
      'ALREADY_EXISTS',
      'VALIDATION_ERROR',
      'FILE_TOO_LARGE',
      'INVALID_FILE_TYPE'
    ];
    
    if (nonRetryableCodes.includes(code)) {
      return false;
    }
    
    // Retryable errors
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'rate limit',
      'quota exceeded',
      'service unavailable',
      'internal',
      'deadline exceeded',
      'unavailable'
    ];
    
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Determine error severity
   */
  private static getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    // Critical errors
    if (message.includes('data loss') || message.includes('corruption')) {
      return 'critical';
    }
    
    // High severity errors
    if (message.includes('auth') || message.includes('permission') || message.includes('security')) {
      return 'high';
    }
    
    // Low severity errors
    if (message.includes('validation') || message.includes('format')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Handle error with appropriate user feedback
   */
  static handleError(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error);
    
    // Log error for debugging (console fallback)
    console.error(`Error in ${context || 'unknown context'}:`, {
      message: appError.message,
      code: appError.code,
      severity: appError.severity,
      retryable: appError.retryable,
      originalError: appError.originalError,
      stack: appError.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Integrate with monitoring services (async, don't wait)
    this.integrateWithMonitoring(appError, context).catch(console.error);
    
    // Show toast notification based on severity (async, but don't wait)
    this.showErrorToast(appError, context).catch(console.error);
    
    return appError;
  }

  /**
   * Integrate error with monitoring services
   */
  private static async integrateWithMonitoring(error: AppError, context?: string): Promise<void> {
    try {
      // Log to structured logger
      const logger = await getLogger();
      if (logger) {
        logger.error(error.message, error.originalError || error, context, {
          code: error.code,
          severity: error.severity,
          retryable: error.retryable,
          userMessage: error.userMessage
        });
      }

      // Track error for analytics and reporting
      const errorTracker = await getErrorTracker();
      if (errorTracker) {
        errorTracker.captureError(error.originalError || error, {
          component: context,
          operation: 'error_handler',
          code: error.code,
          severity: error.severity,
          retryable: error.retryable
        });
      }
    } catch (monitoringError) {
      // Don't let monitoring errors break the main error flow
      console.warn('Failed to integrate with monitoring services:', monitoringError);
    }
  }

  /**
   * Show appropriate toast notification for error
   */
  private static async showErrorToast(error: AppError, context?: string) {
    const title = this.getErrorTitle(error.severity, context);
    const toast = await getToast();
    
    toast({
      variant: error.severity === 'critical' || error.severity === 'high' ? 'destructive' : 'default',
      title,
      description: error.userMessage,
      duration: this.getToastDuration(error.severity),
    });
  }

  /**
   * Get appropriate error title
   */
  private static getErrorTitle(severity: string, context?: string): string {
    const contextPrefix = context ? `${context}: ` : '';
    
    switch (severity) {
      case 'critical':
        return `${contextPrefix}Critical Error`;
      case 'high':
        return `${contextPrefix}Error`;
      case 'medium':
        return `${contextPrefix}Something went wrong`;
      case 'low':
        return `${contextPrefix}Warning`;
      default:
        return `${contextPrefix}Error`;
    }
  }

  /**
   * Get toast duration based on severity
   */
  private static getToastDuration(severity: string): number {
    switch (severity) {
      case 'critical':
        return 10000; // 10 seconds
      case 'high':
        return 7000;  // 7 seconds
      case 'medium':
        return 5000;  // 5 seconds
      case 'low':
        return 3000;  // 3 seconds
      default:
        return 5000;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error: Error) => ErrorHandler.isRetryable(error)
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry if condition is not met
        if (!retryCondition(lastError, attempt)) {
          throw ErrorHandler.handleError(lastError, 'Retry operation');
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(jitteredDelay)}ms`);
        await ErrorHandler.sleep(jitteredDelay);
      }
    }

    throw ErrorHandler.handleError(lastError!, 'Retry operation (max attempts reached)');
  }

  /**
   * Sleep utility for delays
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show success toast
   */
  static async showSuccess(message: string, title?: string) {
    const toast = await getToast();
    toast({
      title: title || 'Success',
      description: message,
      duration: 3000,
    });
  }

  /**
   * Show info toast
   */
  static async showInfo(message: string, title?: string) {
    const toast = await getToast();
    toast({
      title: title || 'Info',
      description: message,
      duration: 4000,
    });
  }

  /**
   * Show warning toast
   */
  static async showWarning(message: string, title?: string) {
    const toast = await getToast();
    toast({
      variant: 'default',
      title: title || 'Warning',
      description: message,
      duration: 5000,
    });
  }
}

// Convenience functions for common error scenarios
export const handleAuthError = (error: unknown) => 
  ErrorHandler.handleError(error, 'Authentication');

export const handleFileError = (error: unknown) => 
  ErrorHandler.handleError(error, 'File Processing');

export const handleDatabaseError = (error: unknown) => 
  ErrorHandler.handleError(error, 'Database');

export const handleAIError = (error: unknown) => 
  ErrorHandler.handleError(error, 'AI Processing');

export const handleNetworkError = (error: unknown) => 
  ErrorHandler.handleError(error, 'Network');

// Export retry utility
export const retryOperation = ErrorHandler.retryOperation;

// Export toast utilities
export const showSuccess = ErrorHandler.showSuccess;
export const showInfo = ErrorHandler.showInfo;
export const showWarning = ErrorHandler.showWarning;