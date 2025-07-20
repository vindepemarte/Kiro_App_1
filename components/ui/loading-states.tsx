'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Loading spinner component with enhanced animations
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'default' | 'pulse' | 'bounce' | 'dots';
}

export function LoadingSpinner({ size = 'md', className = '', text, variant = 'default' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`} aria-hidden="true" />
        );
      case 'bounce':
        return (
          <div className="flex space-x-1">
            <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} aria-hidden="true" />
            <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} aria-hidden="true" />
            <div className={`${sizeClasses[size]} bg-blue-400 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} aria-hidden="true" />
          </div>
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} aria-hidden="true" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} aria-hidden="true" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} aria-hidden="true" />
          </div>
        );
      default:
        return (
          <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-600 transition-all duration-300`} aria-hidden="true" />
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center transition-all duration-300 ${className}`} role="status" aria-live="polite">
      {renderSpinner()}
      {text && (
        <p className="mt-3 text-sm text-gray-600 animate-fade-in" aria-label={`Loading: ${text}`}>{text}</p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Skeleton loading components with enhanced animations
export function SkeletonCard() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="space-y-3">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-3/4"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-1/2"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-5/6"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-4/6"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="flex items-center space-x-4 p-4 border rounded-lg animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="h-10 w-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-3/4"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer w-1/2"></div>
          </div>
          <div className="h-8 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: cols }).map((_, index) => (
          <div key={index} className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-3 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Error state components
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showRetry?: boolean;
  variant?: 'error' | 'warning' | 'network';
  className?: string;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  showRetry = true,
  variant = 'error',
  className = ''
}: ErrorStateProps) {
  const getIcon = () => {
    switch (variant) {
      case 'network':
        return <WifiOff className="h-8 w-8 text-red-500" aria-hidden="true" />;
      case 'warning':
        return <AlertCircle className="h-8 w-8 text-yellow-500" aria-hidden="true" />;
      default:
        return <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />;
    }
  };

  const getAlertVariant = () => {
    switch (variant) {
      case 'warning':
        return 'default';
      default:
        return 'destructive';
    }
  };

  return (
    <div className={`text-center py-8 ${className}`} role="alert" aria-live="assertive">
      <div className="mb-4 flex justify-center">
        {getIcon()}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2" id="error-title">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-md mx-auto" aria-describedby="error-title">{message}</p>
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="outline" aria-label={`${retryText} - ${message}`}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {retryText}
        </Button>
      )}
    </div>
  );
}

// Empty state component
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mb-4 flex justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Loading overlay component
export interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  text = 'Loading...', 
  children, 
  className = '' 
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
}

// Connection status indicator
export interface ConnectionStatusProps {
  isOnline: boolean;
  className?: string;
}

export function ConnectionStatus({ isOnline, className = '' }: ConnectionStatusProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  );
}

// Operation status indicator
export interface OperationStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  successText?: string;
  errorText?: string;
  loadingText?: string;
  className?: string;
}

export function OperationStatus({ 
  status, 
  successText = 'Success',
  errorText = 'Error',
  loadingText = 'Processing...',
  className = ''
}: OperationStatusProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-600">{loadingText}</span>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">{successText}</span>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">{errorText}</span>
          </>
        );
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {content}
    </div>
  );
}

// Progress indicator with steps
export interface ProgressStepsProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
  className?: string;
}

export function ProgressSteps({ steps, className = '' }: ProgressStepsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {step.status === 'completed' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'active' && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            )}
            {step.status === 'error' && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {step.status === 'pending' && (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <span className={`text-sm ${
            step.status === 'completed' ? 'text-green-600' :
            step.status === 'active' ? 'text-blue-600' :
            step.status === 'error' ? 'text-red-600' :
            'text-gray-500'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Retry button with countdown
export interface RetryButtonProps {
  onRetry: () => void;
  disabled?: boolean;
  retryCount?: number;
  maxRetries?: number;
  cooldownSeconds?: number;
  className?: string;
}

export function RetryButton({ 
  onRetry, 
  disabled = false,
  retryCount = 0,
  maxRetries = 3,
  cooldownSeconds = 0,
  className = ''
}: RetryButtonProps) {
  const [countdown, setCountdown] = React.useState(cooldownSeconds);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isDisabled = disabled || countdown > 0 || retryCount >= maxRetries;
  const buttonText = countdown > 0 
    ? `Retry in ${countdown}s` 
    : retryCount >= maxRetries 
      ? 'Max retries reached'
      : `Retry${retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''}`;

  return (
    <Button 
      onClick={onRetry}
      disabled={isDisabled}
      variant="outline"
      className={className}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      {buttonText}
    </Button>
  );
}

// Success feedback component with animations
export interface SuccessFeedbackProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  duration?: number;
  className?: string;
  variant?: 'default' | 'celebration';
}

export function SuccessFeedback({ 
  title = 'Success!',
  message,
  onDismiss,
  autoHide = true,
  duration = 5000,
  className = '',
  variant = 'default'
}: SuccessFeedbackProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 300); // Allow fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      ${className}
    `}>
      <Alert className="bg-green-50 border-green-200 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {variant === 'celebration' ? (
              <div className="relative">
                <CheckCircle className="h-6 w-6 text-green-600 animate-bounce" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600 animate-scale-in" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-green-900 mb-1">{title}</h4>
            <AlertDescription className="text-green-800 text-sm">
              {message}
            </AlertDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(), 300);
              }}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}

// Enhanced error feedback component
export interface ErrorFeedbackProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  variant?: 'error' | 'warning' | 'network';
  className?: string;
  persistent?: boolean;
}

export function ErrorFeedback({ 
  title,
  message,
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  variant = 'error',
  className = '',
  persistent = false
}: ErrorFeedbackProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const getIcon = () => {
    switch (variant) {
      case 'network':
        return <WifiOff className="h-5 w-5 text-red-600 animate-pulse" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600 animate-bounce" />;
      default:
        return <XCircle className="h-5 w-5 text-red-600 animate-shake" />;
    }
  };

  const getColors = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          title: 'text-yellow-900',
          text: 'text-yellow-800',
          button: 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          title: 'text-red-900',
          text: 'text-red-800',
          button: 'text-red-600 hover:text-red-700 hover:bg-red-100'
        };
    }
  };

  const colors = getColors();
  const defaultTitle = variant === 'warning' ? 'Warning' : 'Error';

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      ${className}
    `}>
      <Alert className={`${colors.bg} ${colors.border} shadow-lg`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium ${colors.title} mb-1`}>
              {title || defaultTitle}
            </h4>
            <AlertDescription className={`${colors.text} text-sm mb-3`}>
              {message}
            </AlertDescription>
            <div className="flex items-center space-x-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className={`h-7 px-2 text-xs ${colors.button} border-current`}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {retryText}
                </Button>
              )}
              {onDismiss && !persistent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onDismiss(), 300);
                  }}
                  className={`h-7 px-2 text-xs ${colors.button}`}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

// Animated progress bar component
export interface AnimatedProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
  animated?: boolean;
}

export function AnimatedProgress({ 
  value, 
  max = 100, 
  label, 
  showPercentage = true,
  variant = 'default',
  className = '',
  animated = true
}: AnimatedProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const getColors = () => {
    switch (variant) {
      case 'success':
        return 'from-green-500 to-green-600';
      case 'warning':
        return 'from-yellow-500 to-yellow-600';
      case 'error':
        return 'from-red-500 to-red-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-gray-700">{label}</span>}
          {showPercentage && <span className="text-gray-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`
            h-full bg-gradient-to-r ${getColors()} 
            transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}