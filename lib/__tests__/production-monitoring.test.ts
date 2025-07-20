// Tests for production monitoring services

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import logger, { LogLevel } from '../logger';
import performanceMonitor from '../performance-monitor';
import errorTracker from '../error-tracker';
import healthMonitor from '../health-monitor';

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  onLine: true,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  }
};

// Setup global mocks
beforeEach(() => {
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  Object.defineProperty(global, 'performance', {
    value: mockPerformance,
    writable: true
  });

  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true
  });

  Object.defineProperty(global, 'window', {
    value: {
      location: { href: 'http://localhost:3000/test', pathname: '/test' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    writable: true
  });

  // Reset mocks
  vi.clearAllMocks();
  mockLocalStorage.getItem.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Logger', () => {
  it('should log messages with correct levels', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('Test message', 'test-context', { key: 'value' });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      { key: 'value' }
    );
    
    consoleSpy.mockRestore();
  });

  it('should store logs in localStorage when enabled', () => {
    logger.info('Test message', 'test-context');
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'app_logs',
      expect.stringContaining('Test message')
    );
  });

  it('should handle errors with proper structure', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Test error');
    
    logger.error('Error occurred', testError, 'test-context');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.any(Object),
      expect.objectContaining({
        name: 'Error',
        message: 'Test error'
      })
    );
    
    consoleErrorSpy.mockRestore();
  });

  it('should set and clear user context', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.setUserId('test-user-123');
    logger.info('Test with user context');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('User context updated'),
      expect.any(Object)
    );
    
    logger.clearUserId();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('User context cleared'),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });

  it('should retrieve local logs', () => {
    const mockLogs = JSON.stringify([
      { timestamp: '2023-01-01T00:00:00.000Z', level: LogLevel.INFO, message: 'Test log' }
    ]);
    
    mockLocalStorage.getItem.mockReturnValue(mockLogs);
    
    const logs = logger.getLocalLogs();
    
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test log');
  });
});

describe('Performance Monitor', () => {
  it('should record performance metrics', () => {
    performanceMonitor.recordMetric('test_operation', 1500, 'ms', 'test-context');
    
    const report = performanceMonitor.generateReport();
    
    expect(report.metrics).toContainEqual(
      expect.objectContaining({
        name: 'test_operation',
        value: 1500,
        unit: 'ms',
        context: 'test-context'
      })
    );
  });

  it('should measure async operations', async () => {
    const testOperation = vi.fn().mockResolvedValue('success');
    
    const result = await performanceMonitor.measureAsync(
      'async_test',
      testOperation,
      'test-context'
    );
    
    expect(result).toBe('success');
    expect(testOperation).toHaveBeenCalled();
    
    const report = performanceMonitor.generateReport();
    const metric = report.metrics.find(m => m.name === 'async_test');
    
    expect(metric).toBeDefined();
    expect(metric?.metadata?.success).toBe(true);
  });

  it('should measure sync operations', () => {
    const testOperation = vi.fn().mockReturnValue('sync_result');
    
    const result = performanceMonitor.measureSync(
      'sync_test',
      testOperation,
      'test-context'
    );
    
    expect(result).toBe('sync_result');
    expect(testOperation).toHaveBeenCalled();
    
    const report = performanceMonitor.generateReport();
    const metric = report.metrics.find(m => m.name === 'sync_test');
    
    expect(metric).toBeDefined();
    expect(metric?.metadata?.success).toBe(true);
  });

  it('should handle operation failures', async () => {
    const testError = new Error('Operation failed');
    const failingOperation = vi.fn().mockRejectedValue(testError);
    
    await expect(
      performanceMonitor.measureAsync('failing_test', failingOperation)
    ).rejects.toThrow('Operation failed');
    
    const report = performanceMonitor.generateReport();
    const metric = report.metrics.find(m => m.name === 'failing_test');
    
    expect(metric?.metadata?.success).toBe(false);
    expect(metric?.metadata?.error).toBe('Operation failed');
  });

  it('should generate performance reports', () => {
    // Add some test metrics
    performanceMonitor.recordMetric('page_load_time', 2000, 'ms', 'navigation');
    performanceMonitor.recordMetric('api_call', 500, 'ms', 'api');
    performanceMonitor.recordMetric('memory_used', 75 * 1024 * 1024, 'bytes', 'memory');
    
    const report = performanceMonitor.generateReport();
    
    expect(report.summary.totalMetrics).toBeGreaterThan(0);
    expect(report.summary.averagePageLoad).toBeGreaterThan(0);
    expect(report.recommendations).toBeInstanceOf(Array);
  });

  it('should provide timer functionality', () => {
    const stopTimer = performanceMonitor.startTimer('timer_test', 'test-context');
    
    // Simulate some work
    setTimeout(() => {
      stopTimer();
      
      const report = performanceMonitor.generateReport();
      const metric = report.metrics.find(m => m.name === 'timer_test');
      
      expect(metric).toBeDefined();
      expect(metric?.unit).toBe('ms');
    }, 10);
  });
});

describe('Error Tracker', () => {
  it('should capture and track errors', () => {
    const testError = new Error('Test error for tracking');
    
    const errorId = errorTracker.captureError(testError, {
      component: 'test-component',
      operation: 'test-operation'
    });
    
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    
    const stats = errorTracker.getErrorStats();
    expect(stats.totalErrors).toBeGreaterThan(0);
  });

  it('should add breadcrumbs', () => {
    errorTracker.addBreadcrumb('user', 'User clicked button', 'info', {
      buttonId: 'test-button'
    });
    
    // Capture an error to see breadcrumbs in action
    const testError = new Error('Error with breadcrumbs');
    errorTracker.captureError(testError);
    
    // Breadcrumbs should be included in error reports
    const reports = errorTracker.getLocalErrorReports();
    const latestReport = reports[reports.length - 1];
    
    expect(latestReport?.breadcrumbs).toContainEqual(
      expect.objectContaining({
        category: 'user',
        message: 'User clicked button',
        level: 'info'
      })
    );
  });

  it('should generate error statistics', () => {
    // Generate some test errors
    errorTracker.captureError(new Error('Error 1'), { component: 'comp1' });
    errorTracker.captureError(new Error('Error 2'), { component: 'comp2' });
    errorTracker.captureError(new Error('Error 1'), { component: 'comp1' }); // Duplicate
    
    const stats = errorTracker.getErrorStats();
    
    expect(stats.totalErrors).toBeGreaterThanOrEqual(3);
    expect(stats.uniqueErrors).toBeGreaterThanOrEqual(2);
    expect(stats.errorsByType.Error).toBeGreaterThanOrEqual(3);
  });

  it('should set and clear user context', () => {
    errorTracker.setUserId('test-user-456');
    
    const testError = new Error('Error with user context');
    errorTracker.captureError(testError);
    
    const reports = errorTracker.getLocalErrorReports();
    const latestReport = reports[reports.length - 1];
    
    expect(latestReport?.context.userId).toBe('test-user-456');
    
    errorTracker.clearUserId();
    
    const anotherError = new Error('Error without user context');
    errorTracker.captureError(anotherError);
    
    const updatedReports = errorTracker.getLocalErrorReports();
    const latestUpdatedReport = updatedReports[updatedReports.length - 1];
    
    expect(latestUpdatedReport?.context.userId).toBeUndefined();
  });

  it('should store error reports locally', () => {
    const testError = new Error('Local storage test error');
    errorTracker.captureError(testError);
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'error_reports',
      expect.stringContaining('Local storage test error')
    );
  });
});

describe('Health Monitor', () => {
  it('should perform health checks', async () => {
    const health = await healthMonitor.runHealthCheck();
    
    expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
    expect(health.checks).toBeInstanceOf(Array);
    expect(health.summary.totalChecks).toBeGreaterThan(0);
    expect(health.uptime).toBeGreaterThan(0);
  });

  it('should check browser support', async () => {
    const health = await healthMonitor.runHealthCheck('browser_support');
    
    const browserCheck = health.checks.find(c => c.name === 'browser_support');
    expect(browserCheck).toBeDefined();
    expect(browserCheck?.status).toMatch(/^(healthy|degraded|unhealthy)$/);
  });

  it('should check local storage functionality', async () => {
    const health = await healthMonitor.runHealthCheck('local_storage');
    
    const storageCheck = health.checks.find(c => c.name === 'local_storage');
    expect(storageCheck).toBeDefined();
    
    // Should have attempted to test localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'health_check_test',
      'test_value'
    );
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('health_check_test');
  });

  it('should check memory usage', async () => {
    const health = await healthMonitor.runHealthCheck('memory_usage');
    
    const memoryCheck = health.checks.find(c => c.name === 'memory_usage');
    expect(memoryCheck).toBeDefined();
    expect(memoryCheck?.metadata?.usedMemory).toBe(50 * 1024 * 1024);
  });

  it('should provide system health summary', () => {
    const health = healthMonitor.getSystemHealth();
    
    expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
    expect(health.summary.totalChecks).toBeGreaterThanOrEqual(0);
    expect(health.summary.healthy + health.summary.degraded + health.summary.unhealthy)
      .toBe(health.summary.totalChecks);
  });

  it('should update health thresholds', () => {
    const newThresholds = {
      errorRate: 10,
      responseTime: 3000,
      memoryUsage: 200 * 1024 * 1024,
      pageLoadTime: 5000
    };
    
    healthMonitor.updateThresholds(newThresholds);
    
    // Should not throw and should accept the new thresholds
    expect(() => healthMonitor.updateThresholds(newThresholds)).not.toThrow();
  });
});

describe('Integration Tests', () => {
  it('should integrate error tracking with logging', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const testError = new Error('Integration test error');
    
    // This should trigger both error tracking and logging
    errorTracker.captureError(testError, {
      component: 'integration-test',
      operation: 'test-integration'
    });
    
    // Give async operations time to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have logged the error
    expect(consoleSpy).toHaveBeenCalled();
    
    // Should have stored the error
    const stats = errorTracker.getErrorStats();
    expect(stats.totalErrors).toBeGreaterThan(0);
    
    consoleSpy.mockRestore();
  });

  it('should handle monitoring service failures gracefully', async () => {
    // Mock localStorage to fail
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    // Should not throw even if storage fails
    expect(() => {
      logger.info('Test message that should not crash');
      errorTracker.captureError(new Error('Test error'));
      performanceMonitor.recordMetric('test', 100, 'ms');
    }).not.toThrow();
  });

  it('should provide comprehensive monitoring data', async () => {
    // Generate some test data
    logger.info('Test log entry', 'integration-test');
    performanceMonitor.recordMetric('test_metric', 1000, 'ms', 'integration');
    errorTracker.captureError(new Error('Test error'), { component: 'integration' });
    
    // Get all monitoring data
    const [health, performance, errors, logs] = await Promise.all([
      healthMonitor.getSystemHealth(),
      performanceMonitor.generateReport(),
      errorTracker.getErrorStats(),
      Promise.resolve(logger.getLocalLogs())
    ]);
    
    expect(health.overall).toBeDefined();
    expect(performance.summary.totalMetrics).toBeGreaterThan(0);
    expect(errors.totalErrors).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThan(0);
  });
});