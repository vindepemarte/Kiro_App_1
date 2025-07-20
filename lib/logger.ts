// Production-ready logging service with structured logging and multiple outputs

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    operation?: string;
  };
  tags?: string[];
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalStorageEntries: number;
  remoteEndpoint?: string;
  sessionId: string;
  userId?: string;
  environment: 'development' | 'production' | 'test';
}

class ApplicationLogger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      enableLocalStorage: true,
      maxLocalStorageEntries: 1000,
      sessionId: this.generateSessionId(),
      environment: (process.env.NODE_ENV as any) || 'development',
      ...config
    };

    // Start periodic flush
    this.startPeriodicFlush();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('pagehide', () => this.flush());
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
      metadata,
      tags: this.generateTags(level, context)
    };
  }

  private generateTags(level: LogLevel, context?: string): string[] {
    const tags = [
      `env:${this.config.environment}`,
      `level:${LogLevel[level].toLowerCase()}`
    ];

    if (context) {
      tags.push(`context:${context}`);
    }

    if (typeof window !== 'undefined') {
      tags.push(`browser:${this.getBrowserInfo()}`);
      tags.push(`url:${window.location.pathname}`);
    }

    return tags;
  }

  private getBrowserInfo(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'chrome';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari')) return 'safari';
    if (ua.includes('Edge')) return 'edge';
    return 'other';
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Add to buffer for remote logging
    if (this.config.enableRemote) {
      this.logBuffer.push(entry);
      
      // Flush immediately for critical errors
      if (entry.level >= LogLevel.ERROR) {
        await this.flush();
      } else if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
        await this.flush();
      }
    }

    // Local storage for debugging
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      this.writeToLocalStorage(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${LogLevel[entry.level]}]`;
    const message = entry.context ? `${prefix} [${entry.context}] ${entry.message}` : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.metadata, entry.error);
        break;
    }
  }

  private writeToLocalStorage(entry: LogEntry): void {
    try {
      const key = 'app_logs';
      const existing = localStorage.getItem(key);
      const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
      
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxLocalStorageEntries) {
        logs.splice(0, logs.length - this.config.maxLocalStorageEntries);
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush().catch(console.error);
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flush(): Promise<void> {
    if (!this.config.enableRemote || this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (this.config.remoteEndpoint) {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            logs: logsToSend,
            metadata: {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              url: typeof window !== 'undefined' ? window.location.href : undefined,
              timestamp: new Date().toISOString()
            }
          })
        });
      }
    } catch (error) {
      // If remote logging fails, put logs back in buffer
      this.logBuffer.unshift(...logsToSend);
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  // Public logging methods
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
    this.writeLog(entry);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
    this.writeLog(entry);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
    this.writeLog(entry);
  }

  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }
    
    this.writeLog(entry);
  }

  critical(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, context, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }
    
    this.writeLog(entry);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, `Performance: ${operation}`, context, metadata);
    entry.performance = {
      operation,
      duration,
      memory: this.getMemoryUsage()
    };
    this.writeLog(entry);
  }

  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  // User context management
  setUserId(userId: string): void {
    this.config.userId = userId;
    this.info('User context updated', 'auth', { userId });
  }

  clearUserId(): void {
    const previousUserId = this.config.userId;
    this.config.userId = undefined;
    this.info('User context cleared', 'auth', { previousUserId });
  }

  // Configuration updates
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.info('Logger configuration updated', 'config', updates);
  }

  // Get logs for debugging
  getLocalLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const logs = localStorage.getItem('app_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  // Clear local logs
  clearLocalLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
      this.info('Local logs cleared', 'maintenance');
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush().catch(console.error);
  }
}

// Create singleton instance
const logger = new ApplicationLogger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT
});

export default logger;

// Convenience exports
export const log = {
  debug: (message: string, context?: string, metadata?: Record<string, any>) => 
    logger.debug(message, context, metadata),
  info: (message: string, context?: string, metadata?: Record<string, any>) => 
    logger.info(message, context, metadata),
  warn: (message: string, context?: string, metadata?: Record<string, any>) => 
    logger.warn(message, context, metadata),
  error: (message: string, error?: Error, context?: string, metadata?: Record<string, any>) => 
    logger.error(message, error, context, metadata),
  critical: (message: string, error?: Error, context?: string, metadata?: Record<string, any>) => 
    logger.critical(message, error, context, metadata),
  performance: (operation: string, duration: number, context?: string, metadata?: Record<string, any>) => 
    logger.performance(operation, duration, context, metadata)
};