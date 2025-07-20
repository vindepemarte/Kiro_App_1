'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X, 
  RefreshCw,
  Loader2,
  Zap,
  Star,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced toast notification system
export interface EnhancedToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  progress?: number;
  variant?: 'default' | 'celebration' | 'minimal';
}

export function EnhancedToast({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  onDismiss,
  onAction,
  actionLabel,
  progress,
  variant = 'default'
}: EnhancedToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!persistent && type !== 'loading') {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onDismiss?.();
        }, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [persistent, type, duration, onDismiss]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return variant === 'celebration' ? (
          <div className="relative">
            <CheckCircle className="h-5 w-5 text-green-600 animate-bounce-in" />
            <Star className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-pulse" />
          </div>
        ) : (
          <CheckCircle className="h-5 w-5 text-green-600 animate-scale-in" />
        );
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600 animate-shake" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600 animate-bounce" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600 animate-scale-in" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          title: 'text-green-900',
          text: 'text-green-800',
          accent: 'bg-green-100'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          title: 'text-red-900',
          text: 'text-red-800',
          accent: 'bg-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          title: 'text-yellow-900',
          text: 'text-yellow-800',
          accent: 'bg-yellow-100'
        };
      case 'info':
      case 'loading':
        return {
          bg: 'bg-blue-50 border-blue-200',
          title: 'text-blue-900',
          text: 'text-blue-800',
          accent: 'bg-blue-100'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          title: 'text-gray-900',
          text: 'text-gray-800',
          accent: 'bg-gray-100'
        };
    }
  };

  if (!isVisible) return null;

  const colors = getColors();

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-out mb-3',
        isExiting 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100',
        variant === 'minimal' ? 'animate-slide-down' : 'animate-slide-up'
      )}
    >
      <Card className={cn(
        'shadow-lg border-l-4',
        colors.bg,
        variant === 'celebration' && 'shadow-xl border-l-8'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              {title && (
                <h4 className={cn('text-sm font-semibold mb-1', colors.title)}>
                  {title}
                  {variant === 'celebration' && (
                    <Heart className="inline h-4 w-4 ml-1 text-red-500 animate-pulse" />
                  )}
                </h4>
              )}
              
              <p className={cn('text-sm', colors.text)}>
                {message}
              </p>
              
              {progress !== undefined && (
                <div className="mt-3">
                  <Progress 
                    value={progress} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                </div>
              )}
              
              {(onAction || !persistent) && (
                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    {onAction && actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onAction}
                        className={cn(
                          'h-7 px-3 text-xs border-current',
                          colors.text
                        )}
                      >
                        {type === 'error' && <RefreshCw className="h-3 w-3 mr-1" />}
                        {actionLabel}
                      </Button>
                    )}
                  </div>
                  
                  {!persistent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExiting(true);
                        setTimeout(() => {
                          setIsVisible(false);
                          onDismiss?.();
                        }, 300);
                      }}
                      className={cn(
                        'h-6 w-6 p-0 hover:bg-opacity-20',
                        colors.text
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Toast container component
export interface ToastContainerProps {
  toasts: EnhancedToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  className?: string;
}

export function ToastContainer({ 
  toasts, 
  position = 'top-right',
  className = '' 
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      className={cn(
        'fixed z-50 max-w-sm w-full',
        'sm:max-w-md',
        'md:max-w-lg',
        getPositionClasses(),
        className
      )}
      style={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      {toasts.map((toast) => (
        <EnhancedToast key={toast.id} {...toast} />
      ))}
    </div>
  );
}

// Hook for managing enhanced toasts
export function useEnhancedToast() {
  const [toasts, setToasts] = useState<EnhancedToastProps[]>([]);

  const addToast = (toast: Omit<EnhancedToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const updateToast = (id: string, updates: Partial<EnhancedToastProps>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'success',
      message,
      title: 'Success!',
      ...options
    });
  };

  const error = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'error',
      message,
      title: 'Error',
      persistent: true,
      ...options
    });
  };

  const warning = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'warning',
      message,
      title: 'Warning',
      ...options
    });
  };

  const info = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'info',
      message,
      title: 'Info',
      ...options
    });
  };

  const loading = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'loading',
      message,
      title: 'Loading...',
      persistent: true,
      ...options
    });
  };

  const celebrate = (message: string, options?: Partial<EnhancedToastProps>) => {
    return addToast({
      type: 'success',
      message,
      title: 'Awesome!',
      variant: 'celebration',
      duration: 8000,
      ...options
    });
  };

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAll,
    success,
    error,
    warning,
    info,
    loading,
    celebrate
  };
}

// Floating action feedback component
export interface FloatingFeedbackProps {
  isVisible: boolean;
  type: 'success' | 'error' | 'loading';
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function FloatingFeedback({
  isVisible,
  type,
  message,
  onDismiss,
  className = ''
}: FloatingFeedbackProps) {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'loading':
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'loading':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
      'animate-slide-up',
      className
    )}>
      <div className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg',
        'backdrop-blur-sm',
        getColors()
      )}>
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
        {onDismiss && type !== 'loading' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-black/10"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}