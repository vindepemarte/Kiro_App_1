// Tests for comprehensive error handling system

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, AppError, retryOperation } from '../error-handler';

// Mock toast function
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.severity).toBe('medium');
      expect(error.userMessage).toBe('An unexpected error occurred. Please try again or contact support if the problem continues.');
    });

    it('should create AppError with custom values', () => {
      const error = new AppError(
        'Custom error',
        'CUSTOM_CODE',
        true,
        'Custom user message',
        'high'
      );
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toBe('Custom user message');
      expect(error.severity).toBe('high');
    });

    it('should generate user-friendly messages for network errors', () => {
      const error = new AppError('Network request failed');
      expect(error.userMessage).toContain('Network connection issue');
    });

    it('should generate user-friendly messages for auth errors', () => {
      const error = new AppError('Authentication failed');
      expect(error.userMessage).toContain('Authentication error');
    });

    it('should generate user-friendly messages for quota errors', () => {
      const error = new AppError('Quota exceeded');
      expect(error.userMessage).toContain('Service temporarily unavailable');
    });
  });

  describe('ErrorHandler.normalizeError', () => {
    it('should return AppError as-is', () => {
      const appError = new AppError('Test error');
      const result = ErrorHandler.normalizeError(appError);
      
      expect(result).toBe(appError);
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const result = ErrorHandler.normalizeError(error);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Test error');
      expect(result.originalError).toBe(error);
    });

    it('should convert string to AppError', () => {
      const result = ErrorHandler.normalizeError('String error');
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const result = ErrorHandler.normalizeError({ unknown: 'object' });
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Unknown error occurred');
    });
  });

  describe('ErrorHandler.handleError', () => {
    it('should handle error and return AppError', () => {
      const error = new Error('Test error');
      const result = ErrorHandler.handleError(error, 'Test context');
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Test error');
    });

    it('should log error details', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');
      
      ErrorHandler.handleError(error, 'Test context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in Test context:'),
        expect.objectContaining({
          message: 'Test error',
          code: 'UNKNOWN_ERROR',
        })
      );
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await retryOperation(operation, { maxRetries: 2, baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Permission denied'));
      
      await expect(retryOperation(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(retryOperation(operation, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom retry condition', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Custom error'));
      const retryCondition = vi.fn().mockReturnValue(false);
      
      await expect(retryOperation(operation, { retryCondition })).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(expect.any(Error), 0);
    });
  });

  describe('Error classification', () => {
    it('should identify network errors as retryable', () => {
      const error = new Error('fetch failed');
      const appError = ErrorHandler.normalizeError(error);
      
      expect(appError.retryable).toBe(true);
      expect(appError.code).toBe('NETWORK_ERROR');
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('Request timeout');
      const appError = ErrorHandler.normalizeError(error);
      
      expect(appError.retryable).toBe(true);
      expect(appError.code).toBe('TIMEOUT_ERROR');
    });

    it('should identify auth errors as high severity', () => {
      const error = new Error('Authentication failed');
      const appError = ErrorHandler.normalizeError(error);
      
      expect(appError.severity).toBe('high');
    });

    it('should identify validation errors as low severity', () => {
      const error = new Error('Validation failed');
      const appError = ErrorHandler.normalizeError(error);
      
      expect(appError.severity).toBe('low');
    });
  });

  describe('Firebase error handling', () => {
    it('should handle Firebase errors with codes', () => {
      const firebaseError = {
        name: 'FirebaseError',
        message: 'Permission denied',
        code: 'permission-denied'
      } as Error & { code: string };
      
      const appError = ErrorHandler.normalizeError(firebaseError);
      
      expect(appError.code).toBe('PERMISSION_DENIED');
      expect(appError.retryable).toBe(false);
    });

    it('should handle Firestore unavailable errors as retryable', () => {
      const firestoreError = {
        name: 'FirebaseError',
        message: 'Service unavailable',
        code: 'unavailable'
      } as Error & { code: string };
      
      const appError = ErrorHandler.normalizeError(firestoreError);
      
      expect(appError.retryable).toBe(true);
    });
  });
});