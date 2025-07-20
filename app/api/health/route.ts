// Health check API endpoint for production monitoring

import { NextRequest, NextResponse } from 'next/server';
import healthMonitor from '@/lib/health-monitor';
import performanceMonitor from '@/lib/performance-monitor';
import errorTracker from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';
    const check = searchParams.get('check');

    if (check) {
      // Run specific health check
      const health = await healthMonitor.runHealthCheck(check);
      return NextResponse.json(health);
    }

    if (detailed) {
      // Return detailed monitoring data
      const [health, performance, errors] = await Promise.all([
        healthMonitor.getSystemHealth(),
        performanceMonitor.generateReport(),
        errorTracker.getErrorStats()
      ]);

      return NextResponse.json({
        health,
        performance: {
          summary: performance.summary,
          thresholdViolations: performance.thresholdViolations.length,
          recommendations: performance.recommendations
        },
        errors: {
          totalErrors: errors.totalErrors,
          errorRate: errors.errorRate,
          uniqueErrors: errors.uniqueErrors,
          affectedUsers: errors.affectedUsers
        },
        timestamp: new Date().toISOString()
      });
    }

    // Basic health check
    const health = healthMonitor.getSystemHealth();
    
    return NextResponse.json({
      status: health.overall,
      uptime: health.uptime,
      checks: health.summary,
      timestamp: new Date().toISOString()
    }, {
      status: health.overall === 'healthy' ? 200 : 
             health.overall === 'degraded' ? 206 : 503
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  // Simple connectivity test for health checks
  try {
    const health = healthMonitor.getSystemHealth();
    return new NextResponse(null, {
      status: health.overall === 'healthy' ? 200 : 
             health.overall === 'degraded' ? 206 : 503,
      headers: {
        'X-Health-Status': health.overall,
        'X-Uptime': health.uptime.toString(),
        'X-Timestamp': new Date().toISOString()
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}