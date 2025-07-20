// System health monitoring service for production applications

import logger from './logger';
import performanceMonitor from './performance-monitor';
import errorTracker from './error-tracker';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    totalChecks: number;
  };
  uptime: number;
  lastUpdated: string;
}

export interface HealthThresholds {
  errorRate: number;        // Maximum error rate percentage
  responseTime: number;     // Maximum response time in ms
  memoryUsage: number;      // Maximum memory usage in bytes
  pageLoadTime: number;     // Maximum page load time in ms
}

class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private startTime: number;
  private checkInterval?: NodeJS.Timeout;
  private thresholds: HealthThresholds;

  constructor() {
    this.startTime = Date.now();
    this.thresholds = {
      errorRate: 5,           // 5% error rate
      responseTime: 5000,     // 5 seconds
      memoryUsage: 100 * 1024 * 1024, // 100MB
      pageLoadTime: 3000      // 3 seconds
    };

    this.initializeHealthChecks();
    this.startPeriodicChecks();
  }

  private initializeHealthChecks(): void {
    // Register core health checks
    this.registerCheck('browser_support', this.checkBrowserSupport.bind(this));
    this.registerCheck('local_storage', this.checkLocalStorage.bind(this));
    this.registerCheck('network_connectivity', this.checkNetworkConnectivity.bind(this));
    this.registerCheck('memory_usage', this.checkMemoryUsage.bind(this));
    this.registerCheck('error_rate', this.checkErrorRate.bind(this));
    this.registerCheck('performance', this.checkPerformance.bind(this));
    
    // Firebase-specific checks
    this.registerCheck('firebase_config', this.checkFirebaseConfig.bind(this));
    
    // API checks
    this.registerCheck('gemini_api', this.checkGeminiAPI.bind(this));
  }

  private startPeriodicChecks(): void {
    // Run health checks every 2 minutes
    this.checkInterval = setInterval(() => {
      this.runAllChecks().catch(error => {
        logger.error('Health check failed', error, 'health-monitor');
      });
    }, 2 * 60 * 1000);

    // Run initial checks
    setTimeout(() => {
      this.runAllChecks().catch(error => {
        logger.error('Initial health check failed', error, 'health-monitor');
      });
    }, 5000); // Wait 5 seconds after startup
  }

  private registerCheck(name: string, checkFunction: () => Promise<HealthCheck>): void {
    // Store the check function for later execution
    (this as any)[`_check_${name}`] = checkFunction;
  }

  private async runAllChecks(): Promise<void> {
    const checkPromises: Promise<void>[] = [];

    // Find all registered check functions
    const checkNames = Object.getOwnPropertyNames(this)
      .filter(name => name.startsWith('_check_'))
      .map(name => name.replace('_check_', ''));

    for (const checkName of checkNames) {
      const checkFunction = (this as any)[`_check_${checkName}`];
      if (typeof checkFunction === 'function') {
        checkPromises.push(
          this.runSingleCheck(checkName, checkFunction).catch(error => {
            logger.warn(`Health check ${checkName} failed`, 'health-monitor', { error: error.message });
          })
        );
      }
    }

    await Promise.all(checkPromises);
    
    // Log overall health status
    const health = this.getSystemHealth();
    if (health.overall !== 'healthy') {
      logger.warn(`System health is ${health.overall}`, 'health-monitor', {
        unhealthyChecks: health.checks.filter(c => c.status === 'unhealthy').length,
        degradedChecks: health.checks.filter(c => c.status === 'degraded').length
      });
    }
  }

  private async runSingleCheck(name: string, checkFunction: () => Promise<HealthCheck>): Promise<void> {
    try {
      const startTime = performance.now();
      const result = await checkFunction();
      const responseTime = performance.now() - startTime;
      
      this.checks.set(name, {
        ...result,
        responseTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.checks.set(name, {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Individual health check implementations
  private async checkBrowserSupport(): Promise<HealthCheck> {
    const requiredFeatures = [
      'fetch',
      'localStorage',
      'Promise',
      'WebSocket',
      'FileReader'
    ];

    const missingFeatures = requiredFeatures.filter(feature => {
      try {
        return typeof (window as any)[feature] === 'undefined';
      } catch {
        return true;
      }
    });

    if (missingFeatures.length === 0) {
      return {
        name: 'browser_support',
        status: 'healthy',
        message: 'All required browser features are supported'
      };
    } else if (missingFeatures.length <= 1) {
      return {
        name: 'browser_support',
        status: 'degraded',
        message: `Some features missing: ${missingFeatures.join(', ')}`,
        metadata: { missingFeatures }
      };
    } else {
      return {
        name: 'browser_support',
        status: 'unhealthy',
        message: `Many features missing: ${missingFeatures.join(', ')}`,
        metadata: { missingFeatures }
      };
    }
  }

  private async checkLocalStorage(): Promise<HealthCheck> {
    try {
      const testKey = 'health_check_test';
      const testValue = 'test_value';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved === testValue) {
        return {
          name: 'local_storage',
          status: 'healthy',
          message: 'Local storage is working correctly'
        };
      } else {
        return {
          name: 'local_storage',
          status: 'unhealthy',
          message: 'Local storage read/write test failed'
        };
      }
    } catch (error) {
      return {
        name: 'local_storage',
        status: 'unhealthy',
        message: `Local storage error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      return {
        name: 'network_connectivity',
        status: 'unhealthy',
        message: 'Browser reports offline status'
      };
    }

    try {
      // Test with a simple request to a reliable endpoint
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        return {
          name: 'network_connectivity',
          status: 'healthy',
          message: 'Network connectivity is working'
        };
      } else {
        return {
          name: 'network_connectivity',
          status: 'degraded',
          message: `Network request returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        name: 'network_connectivity',
        status: 'degraded',
        message: 'Network connectivity test failed - using fallback checks'
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return {
        name: 'memory_usage',
        status: 'healthy',
        message: 'Memory monitoring not available in this browser'
      };
    }

    const memory = (performance as any).memory;
    const usedMemory = memory.usedJSHeapSize;
    const totalMemory = memory.totalJSHeapSize;
    const memoryLimit = memory.jsHeapSizeLimit;

    const usagePercentage = (usedMemory / memoryLimit) * 100;

    if (usedMemory > this.thresholds.memoryUsage) {
      return {
        name: 'memory_usage',
        status: 'unhealthy',
        message: `High memory usage: ${Math.round(usedMemory / 1024 / 1024)}MB`,
        metadata: { usedMemory, totalMemory, memoryLimit, usagePercentage }
      };
    } else if (usagePercentage > 70) {
      return {
        name: 'memory_usage',
        status: 'degraded',
        message: `Elevated memory usage: ${usagePercentage.toFixed(1)}%`,
        metadata: { usedMemory, totalMemory, memoryLimit, usagePercentage }
      };
    } else {
      return {
        name: 'memory_usage',
        status: 'healthy',
        message: `Memory usage normal: ${usagePercentage.toFixed(1)}%`,
        metadata: { usedMemory, totalMemory, memoryLimit, usagePercentage }
      };
    }
  }

  private async checkErrorRate(): Promise<HealthCheck> {
    const errorStats = errorTracker.getErrorStats();
    
    if (errorStats.errorRate > this.thresholds.errorRate) {
      return {
        name: 'error_rate',
        status: 'unhealthy',
        message: `High error rate: ${errorStats.errorRate.toFixed(1)} errors/hour`,
        metadata: errorStats
      };
    } else if (errorStats.errorRate > this.thresholds.errorRate / 2) {
      return {
        name: 'error_rate',
        status: 'degraded',
        message: `Elevated error rate: ${errorStats.errorRate.toFixed(1)} errors/hour`,
        metadata: errorStats
      };
    } else {
      return {
        name: 'error_rate',
        status: 'healthy',
        message: `Error rate normal: ${errorStats.errorRate.toFixed(1)} errors/hour`,
        metadata: errorStats
      };
    }
  }

  private async checkPerformance(): Promise<HealthCheck> {
    const perfReport = performanceMonitor.generateReport();
    
    if (perfReport.thresholdViolations.length > 5) {
      return {
        name: 'performance',
        status: 'unhealthy',
        message: `Multiple performance issues: ${perfReport.thresholdViolations.length} violations`,
        metadata: { violations: perfReport.thresholdViolations.length, averagePageLoad: perfReport.summary.averagePageLoad }
      };
    } else if (perfReport.thresholdViolations.length > 0) {
      return {
        name: 'performance',
        status: 'degraded',
        message: `Some performance issues: ${perfReport.thresholdViolations.length} violations`,
        metadata: { violations: perfReport.thresholdViolations.length, averagePageLoad: perfReport.summary.averagePageLoad }
      };
    } else {
      return {
        name: 'performance',
        status: 'healthy',
        message: 'Performance metrics within acceptable ranges',
        metadata: { averagePageLoad: perfReport.summary.averagePageLoad }
      };
    }
  }

  private async checkFirebaseConfig(): Promise<HealthCheck> {
    try {
      const { getAppConfig, validateConfig } = await import('./config');
      const config = getAppConfig();
      const validation = validateConfig(config);
      
      if (validation.isValid) {
        return {
          name: 'firebase_config',
          status: 'healthy',
          message: 'Firebase configuration is valid'
        };
      } else {
        return {
          name: 'firebase_config',
          status: 'unhealthy',
          message: `Firebase configuration errors: ${validation.errors.join(', ')}`,
          metadata: { errors: validation.errors }
        };
      }
    } catch (error) {
      return {
        name: 'firebase_config',
        status: 'unhealthy',
        message: `Firebase configuration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkGeminiAPI(): Promise<HealthCheck> {
    try {
      const { getAppConfig } = await import('./config');
      const config = getAppConfig();
      
      if (!config.gemini.apiKey || config.gemini.apiKey === 'demo-gemini-key') {
        return {
          name: 'gemini_api',
          status: 'degraded',
          message: 'Gemini API key not configured - using demo mode'
        };
      }
      
      // We can't easily test the API without making a real request,
      // so we just check if the key is configured
      return {
        name: 'gemini_api',
        status: 'healthy',
        message: 'Gemini API configuration appears valid'
      };
    } catch (error) {
      return {
        name: 'gemini_api',
        status: 'unhealthy',
        message: `Gemini API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Public API
  getSystemHealth(): SystemHealth {
    const checks = Array.from(this.checks.values());
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy > 0) {
      overall = 'unhealthy';
    } else if (degraded > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      checks,
      summary: {
        healthy,
        degraded,
        unhealthy,
        totalChecks: checks.length
      },
      uptime: Date.now() - this.startTime,
      lastUpdated: new Date().toISOString()
    };
  }

  async runHealthCheck(checkName?: string): Promise<SystemHealth> {
    if (checkName) {
      const checkFunction = (this as any)[`_check_${checkName}`];
      if (typeof checkFunction === 'function') {
        await this.runSingleCheck(checkName, checkFunction);
      }
    } else {
      await this.runAllChecks();
    }
    
    return this.getSystemHealth();
  }

  updateThresholds(thresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Health monitor thresholds updated', 'health-monitor', thresholds);
  }

  // Cleanup
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Create singleton instance
const healthMonitor = new HealthMonitor();

export default healthMonitor;

// Convenience exports
export const getHealth = () => healthMonitor.getSystemHealth();
export const runHealthCheck = (checkName?: string) => healthMonitor.runHealthCheck(checkName);