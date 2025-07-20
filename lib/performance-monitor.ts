// Performance monitoring service for production applications

import logger from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  pageLoad: number;
  apiCall: number;
  fileUpload: number;
  aiProcessing: number;
  databaseQuery: number;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averagePageLoad: number;
    slowestOperations: PerformanceMetric[];
    memoryUsage?: number;
    errorRate: number;
  };
  thresholdViolations: PerformanceMetric[];
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds;
  private maxMetrics = 1000;
  private reportingInterval?: NodeJS.Timeout;

  constructor() {
    this.thresholds = {
      pageLoad: 3000,      // 3 seconds
      apiCall: 5000,       // 5 seconds
      fileUpload: 30000,   // 30 seconds
      aiProcessing: 60000, // 60 seconds
      databaseQuery: 2000  // 2 seconds
    };

    this.initializeWebVitals();
    this.startPeriodicReporting();
  }

  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Monitor Core Web Vitals
    this.observePerformanceEntries();
    this.monitorMemoryUsage();
    this.monitorNetworkStatus();
  }

  private observePerformanceEntries(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('lcp', lastEntry.startTime, 'ms', 'web-vitals');
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric('fid', entry.processingStart - entry.startTime, 'ms', 'web-vitals');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let clsValue = 0;
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric('cls', clsValue, 'count', 'web-vitals');
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, 'ms', 'navigation');
        this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms', 'navigation');
        this.recordMetric('first_byte', navigation.responseStart - navigation.fetchStart, 'ms', 'navigation');
      }
    });
  }

  private monitorMemoryUsage(): void {
    if (typeof performance === 'undefined' || !(performance as any).memory) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes', 'memory');
      this.recordMetric('memory_total', memory.totalJSHeapSize, 'bytes', 'memory');
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes', 'memory');
    };

    // Check memory usage every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  private monitorNetworkStatus(): void {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (connection) {
      this.recordMetric('network_downlink', connection.downlink, 'count', 'network');
      this.recordMetric('network_rtt', connection.rtt, 'ms', 'network');
      
      connection.addEventListener('change', () => {
        this.recordMetric('network_downlink', connection.downlink, 'count', 'network');
        this.recordMetric('network_rtt', connection.rtt, 'ms', 'network');
      });
    }
  }

  private startPeriodicReporting(): void {
    // Generate performance report every 5 minutes
    this.reportingInterval = setInterval(() => {
      const report = this.generateReport();
      if (report.thresholdViolations.length > 0) {
        logger.warn('Performance thresholds violated', 'performance', {
          violations: report.thresholdViolations.length,
          slowestOperations: report.summary.slowestOperations
        });
      }
    }, 5 * 60 * 1000);
  }

  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percentage',
    context?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context,
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check thresholds
    this.checkThreshold(metric);

    // Log significant metrics
    if (this.isSignificantMetric(metric)) {
      logger.performance(name, value, context, metadata);
    }
  }

  private checkThreshold(metric: PerformanceMetric): void {
    let threshold: number | undefined;

    switch (metric.context) {
      case 'navigation':
        if (metric.name === 'page_load_time') threshold = this.thresholds.pageLoad;
        break;
      case 'api':
        threshold = this.thresholds.apiCall;
        break;
      case 'file-upload':
        threshold = this.thresholds.fileUpload;
        break;
      case 'ai-processing':
        threshold = this.thresholds.aiProcessing;
        break;
      case 'database':
        threshold = this.thresholds.databaseQuery;
        break;
    }

    if (threshold && metric.value > threshold) {
      logger.warn(`Performance threshold exceeded: ${metric.name}`, 'performance', {
        value: metric.value,
        threshold,
        unit: metric.unit
      });
    }
  }

  private isSignificantMetric(metric: PerformanceMetric): boolean {
    // Log all web vitals and slow operations
    if (metric.context === 'web-vitals') return true;
    if (metric.unit === 'ms' && metric.value > 1000) return true;
    if (metric.context === 'memory' && metric.name === 'memory_used') return true;
    return false;
  }

  // Timing utilities
  startTimer(name: string, context?: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context);
    };
  }

  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    context?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    operation: () => T,
    context?: string,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'ms', context, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  // Reporting
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000); // Last 5 minutes

    const pageLoadMetrics = recentMetrics.filter(m => m.name === 'page_load_time');
    const averagePageLoad = pageLoadMetrics.length > 0 
      ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length 
      : 0;

    const slowestOperations = recentMetrics
      .filter(m => m.unit === 'ms')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const errorMetrics = recentMetrics.filter(m => m.metadata?.success === false);
    const errorRate = recentMetrics.length > 0 ? (errorMetrics.length / recentMetrics.length) * 100 : 0;

    const thresholdViolations = recentMetrics.filter(metric => {
      let threshold: number | undefined;
      switch (metric.context) {
        case 'navigation':
          if (metric.name === 'page_load_time') threshold = this.thresholds.pageLoad;
          break;
        case 'api':
          threshold = this.thresholds.apiCall;
          break;
        case 'file-upload':
          threshold = this.thresholds.fileUpload;
          break;
        case 'ai-processing':
          threshold = this.thresholds.aiProcessing;
          break;
        case 'database':
          threshold = this.thresholds.databaseQuery;
          break;
      }
      return threshold && metric.value > threshold;
    });

    const recommendations = this.generateRecommendations(recentMetrics, thresholdViolations);

    return {
      metrics: recentMetrics,
      summary: {
        totalMetrics: recentMetrics.length,
        averagePageLoad,
        slowestOperations,
        memoryUsage: this.getCurrentMemoryUsage(),
        errorRate
      },
      thresholdViolations,
      recommendations
    };
  }

  private getCurrentMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  private generateRecommendations(metrics: PerformanceMetric[], violations: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    // Page load recommendations
    const pageLoadMetrics = metrics.filter(m => m.name === 'page_load_time');
    if (pageLoadMetrics.some(m => m.value > 3000)) {
      recommendations.push('Consider optimizing page load time - some pages are loading slowly');
    }

    // Memory recommendations
    const memoryMetrics = metrics.filter(m => m.name === 'memory_used');
    const highMemoryUsage = memoryMetrics.some(m => m.value > 50 * 1024 * 1024); // 50MB
    if (highMemoryUsage) {
      recommendations.push('High memory usage detected - consider optimizing memory-intensive operations');
    }

    // API call recommendations
    const apiMetrics = metrics.filter(m => m.context === 'api');
    if (apiMetrics.some(m => m.value > 5000)) {
      recommendations.push('Some API calls are taking too long - consider optimization or caching');
    }

    // Error rate recommendations
    const errorMetrics = metrics.filter(m => m.metadata?.success === false);
    const errorRate = metrics.length > 0 ? (errorMetrics.length / metrics.length) * 100 : 0;
    if (errorRate > 5) {
      recommendations.push(`High error rate detected (${errorRate.toFixed(1)}%) - investigate failing operations`);
    }

    // Web vitals recommendations
    const lcpMetrics = metrics.filter(m => m.name === 'lcp');
    if (lcpMetrics.some(m => m.value > 2500)) {
      recommendations.push('Largest Contentful Paint is slow - optimize critical rendering path');
    }

    const fidMetrics = metrics.filter(m => m.name === 'fid');
    if (fidMetrics.some(m => m.value > 100)) {
      recommendations.push('First Input Delay is high - optimize JavaScript execution');
    }

    const clsMetrics = metrics.filter(m => m.name === 'cls');
    if (clsMetrics.some(m => m.value > 0.1)) {
      recommendations.push('Cumulative Layout Shift is high - stabilize page layout');
    }

    return recommendations;
  }

  // Configuration
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Performance thresholds updated', 'performance', thresholds);
  }

  // Cleanup
  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }

  // Export metrics for external analysis
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    logger.info('Performance metrics cleared', 'performance');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Convenience exports
export const perf = {
  record: (name: string, value: number, unit: 'ms' | 'bytes' | 'count' | 'percentage', context?: string, metadata?: Record<string, any>) =>
    performanceMonitor.recordMetric(name, value, unit, context, metadata),
  
  timer: (name: string, context?: string) =>
    performanceMonitor.startTimer(name, context),
  
  measureAsync: <T>(name: string, operation: () => Promise<T>, context?: string, metadata?: Record<string, any>) =>
    performanceMonitor.measureAsync(name, operation, context, metadata),
  
  measureSync: <T>(name: string, operation: () => T, context?: string, metadata?: Record<string, any>) =>
    performanceMonitor.measureSync(name, operation, context, metadata),
  
  report: () => performanceMonitor.generateReport()
};