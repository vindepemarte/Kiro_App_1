'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Memory, 
  Monitor, 
  RefreshCw, 
  TrendingUp,
  XCircle,
  Zap
} from 'lucide-react';

import healthMonitor, { SystemHealth } from '@/lib/health-monitor';
import performanceMonitor, { PerformanceReport } from '@/lib/performance-monitor';
import errorTracker, { ErrorStats } from '@/lib/error-tracker';
import logger from '@/lib/logger';

interface MonitoringData {
  health: SystemHealth;
  performance: PerformanceReport;
  errors: ErrorStats;
  logs: any[];
}

export function ProductionMonitor() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const [health, performance, errors, logs] = await Promise.all([
        healthMonitor.getSystemHealth(),
        performanceMonitor.generateReport(),
        errorTracker.getErrorStats(),
        logger.getLocalLogs().slice(-50) // Last 50 logs
      ]);

      setData({ health, performance, errors, logs });
    } catch (error) {
      logger.error('Failed to fetch monitoring data', error, 'production-monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Monitor className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading monitoring data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Monitoring Unavailable</AlertTitle>
        <AlertDescription>
          Unable to load monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Monitor</h2>
          <p className="text-muted-foreground">
            System health, performance, and error tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getStatusIcon(data.health.overall)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{data.health.overall}</div>
            <p className="text-xs text-muted-foreground">
              {data.health.summary.healthy}/{data.health.summary.totalChecks} checks passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.errors.errorRate.toFixed(1)}/hr</div>
            <p className="text-xs text-muted-foreground">
              {data.errors.totalErrors} errors in 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.performance.summary.averagePageLoad.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Avg page load time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(data.health.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Since last restart
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4">
            {data.health.checks.map((check) => (
              <Card key={check.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {check.name.replace(/_/g, ' ')}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {check.responseTime && (
                        <Badge variant="outline">
                          {check.responseTime.toFixed(0)}ms
                        </Badge>
                      )}
                      <Badge 
                        variant={check.status === 'healthy' ? 'default' : 'destructive'}
                        className={getStatusColor(check.status)}
                      >
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                  {check.metadata && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(check.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Average Page Load</p>
                    <p className="text-2xl font-bold">{data.performance.summary.averagePageLoad.toFixed(0)}ms</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Memory Usage</p>
                    <p className="text-2xl font-bold">
                      {data.performance.summary.memoryUsage 
                        ? formatBytes(data.performance.summary.memoryUsage)
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
                
                {data.performance.thresholdViolations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Performance Issues Detected</AlertTitle>
                    <AlertDescription>
                      {data.performance.thresholdViolations.length} operations exceeded performance thresholds
                    </AlertDescription>
                  </Alert>
                )}

                {data.performance.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {data.performance.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.performance.summary.slowestOperations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Slowest Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.performance.summary.slowestOperations.map((op, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{op.name}</span>
                        <Badge variant="outline">{op.value.toFixed(0)}{op.unit}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Error Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Errors (24h)</span>
                    <span className="font-bold">{data.errors.totalErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Errors</span>
                    <span className="font-bold">{data.errors.uniqueErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Affected Users</span>
                    <span className="font-bold">{data.errors.affectedUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate</span>
                    <span className="font-bold">{data.errors.errorRate.toFixed(1)}/hr</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Errors by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.errors.errorsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Errors by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.errors.errorsBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{severity}</span>
                        <Badge 
                          variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'outline'}
                        >
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.errors.topErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.errors.topErrors.map((error, index) => (
                      <div key={error.fingerprint} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="text-sm font-medium">Error #{index + 1}</span>
                          <p className="text-xs text-muted-foreground">
                            Fingerprint: {error.fingerprint}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{error.count} occurrences</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last seen: {new Date(error.lastSeen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>
                Last 50 log entries from the current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.logs.map((log, index) => (
                  <div key={index} className="text-xs border-l-2 border-muted pl-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge 
                        variant={log.level >= 2 ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'][log.level]}
                      </Badge>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.context && (
                      <span className="text-muted-foreground">[{log.context}]</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}