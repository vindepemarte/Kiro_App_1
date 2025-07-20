'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home, Bug, Copy, Check, Shield, Wifi, WifiOff } from 'lucide-react';
import { ErrorState, RetryButton, ConnectionStatus } from '@/components/ui/loading-states';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableAutoRecovery?: boolean;
  recoveryStrategies?: RecoveryStrategy[];
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  copied: boolean;
  isOnline: boolean;
  autoRecoveryAttempted: boolean;
  recoveryInProgress: boolean;
}

interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => Promise<boolean>;
  condition?: (error: Error) => boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private autoRecoveryTimer?: NodeJS.Timeout;

  public state: State = {
    hasError: false,
    retryCount: 0,
    copied: false,
    isOnline: typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.onLine : true,
    autoRecoveryAttempted: false,
    recoveryInProgress: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOnlineStatusChange);
  }

  public componentWillUnmount() {
    window.removeEventListener('online', this.handleOnlineStatusChange);
    window.removeEventListener('offline', this.handleOnlineStatusChange);
    
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details for debugging
    this.logError(error, errorInfo);

    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRecovery && !this.state.autoRecoveryAttempted) {
      this.attemptAutoRecovery(error);
    }
  }

  private handleOnlineStatusChange = () => {
    if (typeof navigator !== 'undefined') {
      this.setState({ isOnline: navigator.onLine });
      
      // If we're back online and had a network error, try auto-recovery
      if (navigator.onLine && this.state.hasError && this.state.error) {
        const errorMessage = this.state.error.message.toLowerCase();
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          this.attemptAutoRecovery(this.state.error);
        }
      }
    }
  };

  private attemptAutoRecovery = async (error: Error) => {
    if (this.state.autoRecoveryAttempted || this.state.recoveryInProgress) return;

    this.setState({ recoveryInProgress: true, autoRecoveryAttempted: true });

    try {
      // Try default recovery strategies first
      const recovered = await this.tryDefaultRecoveryStrategies(error);
      
      if (!recovered && this.props.recoveryStrategies) {
        // Try custom recovery strategies
        for (const strategy of this.props.recoveryStrategies) {
          if (!strategy.condition || strategy.condition(error)) {
            console.log(`Attempting recovery strategy: ${strategy.name}`);
            const success = await strategy.action();
            if (success) {
              console.log(`Recovery strategy ${strategy.name} succeeded`);
              this.handleRetry();
              return;
            }
          }
        }
      } else if (recovered) {
        this.handleRetry();
        return;
      }
    } catch (recoveryError) {
      console.error('Auto-recovery failed:', recoveryError);
    } finally {
      this.setState({ recoveryInProgress: false });
    }
  };

  private tryDefaultRecoveryStrategies = async (error: Error): Promise<boolean> => {
    const errorMessage = error.message.toLowerCase();

    // Network error recovery
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      // Wait for network to be available
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false; // Will retry when online event fires
      }
      
      // Simple network test
      try {
        await fetch('/api/health', { method: 'HEAD' });
        return true;
      } catch {
        return false;
      }
    }

    // Auth error recovery
    if (errorMessage.includes('auth') || errorMessage.includes('permission')) {
      // Check if user is still authenticated
      try {
        const response = await fetch('/api/auth/check', { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }

    // Memory/resource error recovery
    if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
      // Clear some caches
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  };

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    };

    // In a real app, you'd send this to your error tracking service
    console.error('Detailed error information:', errorDetails);
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1,
        copied: false,
      });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private copyErrorDetails = async () => {
    if (!this.state.error) return;

    const errorText = `Error: ${this.state.error.message}\n\nStack: ${this.state.error.stack}\n\nComponent Stack: ${this.state.errorInfo?.componentStack || 'N/A'}\n\nTimestamp: ${new Date().toISOString()}\nURL: ${typeof window !== 'undefined' ? window.location.href : 'Unknown'}`;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(errorText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  private getUserFriendlyErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (message.includes('auth') || message.includes('permission')) {
      return 'Authentication error. Please refresh the page and sign in again.';
    }
    
    if (message.includes('quota') || message.includes('rate limit')) {
      return 'Service temporarily unavailable due to high demand. Please try again in a few minutes.';
    }
    
    if (message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    
    if (message.includes('parse') || message.includes('json')) {
      return 'Data processing error. Please try again or contact support if the issue persists.';
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the problem continues.';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const userFriendlyMessage = this.state.error ? this.getUserFriendlyErrorMessage(this.state.error) : 'An unexpected error occurred.';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                {userFriendlyMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.retryCount > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Retry attempt {this.state.retryCount} of {this.maxRetries}
                  </AlertDescription>
                </Alert>
              )}

              {this.props.showErrorDetails && this.state.error && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">Error Details</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={this.copyErrorDetails}
                      className="h-6 px-2"
                    >
                      {this.state.copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={this.handleReload}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                </div>
              </div>

              {!canRetry && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    Maximum retry attempts reached. Please reload the page or contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}