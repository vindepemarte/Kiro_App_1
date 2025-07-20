// Enhanced error tracking service for production monitoring

import logger from './logger';
import { ErrorHandler, AppError } from './error-handler';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: {
    userId?: string;
    sessionId: string;
    url: string;
    userAgent: string;
    component?: string;
    operation?: string;
  };
  environment: {
    browser: string;
    os: string;
    screen: string;
    memory?: number;
    connection?: string;
  };
  breadcrumbs: Breadcrumb[];
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fingerprint: string;
}

export interface Breadcrumb {
  timestamp: string;
  category: 'navigation' | 'user' | 'api' | 'console' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  topErrors: Array<{ fingerprint: string; count: number; lastSeen: string }>;
  errorRate: number;
  affectedUsers: number;
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private errorCounts: Map<string, number> = new Map();
  private sessionId: string;
  private userId?: string;
  private maxBreadcrumbs = 50;
  private reportingEndpoint?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.reportingEndpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT;
    
    this.initializeGlobalErrorHandling();
    this.initializeBreadcrumbTracking();
  }

  private generateSessionId(): string {
    return `error_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        component: 'global',
        operation: 'unhandled_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'global',
          operation: 'unhandled_promise_rejection'
        }
      );
    });

    // Catch React error boundary errors (if using React)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if this looks like a React error
      const message = args[0];
      if (typeof message === 'string' && message.includes('React')) {
        this.addBreadcrumb('console', 'React error logged', 'error', { args });
      }
      originalConsoleError.apply(console, args);
    };
  }

  private initializeBreadcrumbTracking(): void {
    if (typeof window === 'undefined') return;

    // Track navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      this.addBreadcrumb('navigation', `Navigated to ${args[2]}`, 'info');
      return originalPushState.apply(history, args);
    }.bind(this);

    history.replaceState = function(...args) {
      this.addBreadcrumb('navigation', `Replaced state with ${args[2]}`, 'info');
      return originalReplaceState.apply(history, args);
    }.bind(this);

    window.addEventListener('popstate', () => {
      this.addBreadcrumb('navigation', `Back/forward to ${window.location.pathname}`, 'info');
    });

    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
        const text = target.textContent?.trim().substring(0, 50) || 'Unknown';
        this.addBreadcrumb('user', `Clicked: ${text}`, 'info', {
          tagName: target.tagName,
          className: target.className,
          id: target.id
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.addBreadcrumb('user', 'Form submitted', 'info', {
        action: form.action,
        method: form.method,
        id: form.id
      });
    });
  }

  addBreadcrumb(
    category: 'navigation' | 'user' | 'api' | 'console' | 'error',
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  captureError(
    error: Error | unknown,
    context?: {
      component?: string;
      operation?: string;
      [key: string]: any;
    }
  ): string {
    const appError = ErrorHandler.normalizeError(error);
    const errorId = this.generateErrorId();
    
    // Create fingerprint for grouping similar errors
    const fingerprint = this.createFingerprint(appError, context);
    
    // Update error counts
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: appError.name,
        message: appError.message,
        stack: appError.stack,
        code: appError.code
      },
      context: {
        userId: this.userId,
        sessionId: this.sessionId,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        component: context?.component,
        operation: context?.operation
      },
      environment: this.getEnvironmentInfo(),
      breadcrumbs: [...this.breadcrumbs],
      metadata: context,
      severity: appError.severity,
      fingerprint
    };

    // Log the error
    logger.error(`Error captured: ${appError.message}`, appError.originalError || appError, 'error-tracker', {
      errorId,
      fingerprint,
      component: context?.component,
      operation: context?.operation
    });

    // Send to remote error tracking service
    this.sendErrorReport(errorReport).catch(err => {
      logger.warn('Failed to send error report', 'error-tracker', { error: err.message });
    });

    // Add error as breadcrumb for future errors
    this.addBreadcrumb('error', `${appError.name}: ${appError.message}`, 'error', {
      errorId,
      fingerprint
    });

    return errorId;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createFingerprint(error: AppError, context?: Record<string, any>): string {
    // Create a unique fingerprint for grouping similar errors
    const parts = [
      error.name,
      error.code,
      context?.component || 'unknown',
      context?.operation || 'unknown'
    ];

    // Add stack trace info if available (first few lines)
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 3);
      parts.push(...stackLines);
    }

    return btoa(parts.join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private getEnvironmentInfo() {
    const env = {
      browser: 'unknown',
      os: 'unknown',
      screen: 'unknown',
      memory: undefined as number | undefined,
      connection: undefined as string | undefined
    };

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      
      // Browser detection
      if (ua.includes('Chrome')) env.browser = 'chrome';
      else if (ua.includes('Firefox')) env.browser = 'firefox';
      else if (ua.includes('Safari')) env.browser = 'safari';
      else if (ua.includes('Edge')) env.browser = 'edge';

      // OS detection
      if (ua.includes('Windows')) env.os = 'windows';
      else if (ua.includes('Mac')) env.os = 'macos';
      else if (ua.includes('Linux')) env.os = 'linux';
      else if (ua.includes('Android')) env.os = 'android';
      else if (ua.includes('iOS')) env.os = 'ios';
    }

    if (typeof screen !== 'undefined') {
      env.screen = `${screen.width}x${screen.height}`;
    }

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      env.memory = (performance as any).memory.usedJSHeapSize;
    }

    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      env.connection = `${conn.effectiveType || 'unknown'} (${conn.downlink || 'unknown'}Mbps)`;
    }

    return env;
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    if (!this.reportingEndpoint) {
      // Store locally if no endpoint configured
      this.storeErrorLocally(report);
      return;
    }

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      // Fallback to local storage
      this.storeErrorLocally(report);
      throw error;
    }
  }

  private storeErrorLocally(report: ErrorReport): void {
    if (typeof window === 'undefined') return;

    try {
      const key = 'error_reports';
      const existing = localStorage.getItem(key);
      const reports: ErrorReport[] = existing ? JSON.parse(existing) : [];
      
      reports.push(report);
      
      // Keep only the most recent 100 error reports
      if (reports.length > 100) {
        reports.splice(0, reports.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(reports));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  // User context management
  setUserId(userId: string): void {
    this.userId = userId;
    this.addBreadcrumb('user', `User identified: ${userId}`, 'info');
    logger.info('Error tracker user context updated', 'error-tracker', { userId });
  }

  clearUserId(): void {
    const previousUserId = this.userId;
    this.userId = undefined;
    this.addBreadcrumb('user', 'User context cleared', 'info');
    logger.info('Error tracker user context cleared', 'error-tracker', { previousUserId });
  }

  // Statistics and reporting
  getErrorStats(): ErrorStats {
    const reports = this.getLocalErrorReports();
    const now = Date.now();
    const last24Hours = reports.filter(r => now - new Date(r.timestamp).getTime() < 24 * 60 * 60 * 1000);

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const fingerprintCounts: Map<string, { count: number; lastSeen: string }> = new Map();
    const affectedUsersSet = new Set<string>();

    last24Hours.forEach(report => {
      // Count by type
      errorsByType[report.error.name] = (errorsByType[report.error.name] || 0) + 1;
      
      // Count by severity
      errorsBySeverity[report.severity] = (errorsBySeverity[report.severity] || 0) + 1;
      
      // Count by fingerprint
      const existing = fingerprintCounts.get(report.fingerprint);
      fingerprintCounts.set(report.fingerprint, {
        count: (existing?.count || 0) + 1,
        lastSeen: report.timestamp
      });
      
      // Track affected users
      if (report.context.userId) {
        affectedUsersSet.add(report.context.userId);
      }
    });

    const topErrors = Array.from(fingerprintCounts.entries())
      .map(([fingerprint, data]) => ({ fingerprint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: last24Hours.length,
      uniqueErrors: fingerprintCounts.size,
      errorsByType,
      errorsBySeverity,
      topErrors,
      errorRate: last24Hours.length / Math.max(1, 24), // errors per hour
      affectedUsers: affectedUsersSet.size
    };
  }

  getLocalErrorReports(): ErrorReport[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const reports = localStorage.getItem('error_reports');
      return reports ? JSON.parse(reports) : [];
    } catch {
      return [];
    }
  }

  clearLocalErrorReports(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error_reports');
      logger.info('Local error reports cleared', 'error-tracker');
    }
  }

  // Configuration
  updateConfig(config: {
    reportingEndpoint?: string;
    maxBreadcrumbs?: number;
  }): void {
    if (config.reportingEndpoint) {
      this.reportingEndpoint = config.reportingEndpoint;
    }
    if (config.maxBreadcrumbs) {
      this.maxBreadcrumbs = config.maxBreadcrumbs;
    }
    logger.info('Error tracker configuration updated', 'error-tracker', config);
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

export default errorTracker;

// Convenience exports
export const trackError = (error: Error | unknown, context?: { component?: string; operation?: string; [key: string]: any }) =>
  errorTracker.captureError(error, context);

export const addBreadcrumb = (
  category: 'navigation' | 'user' | 'api' | 'console' | 'error',
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) => errorTracker.addBreadcrumb(category, message, level, data);