'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Upload,
  Database,
  Wifi,
  Shield,
  FileText
} from 'lucide-react';
import { 
  useLoadingStates, 
  useErrorStates, 
  useGlobalLoading,
  LoadingStateManager,
  LoadingState,
  ErrorState
} from '@/lib/loading-state-manager';
import { LoadingOverlay } from '@/components/ui/loading-states';

// Global loading overlay component
export function GlobalLoadingOverlay() {
  const { isLoading, message } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Please wait</h3>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading states display component
export function LoadingStatesDisplay() {
  const loadingStates = useLoadingStates();

  if (loadingStates.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-40 max-w-sm">
      {loadingStates.map((state) => (
        <LoadingStateCard key={state.id} state={state} />
      ))}
    </div>
  );
}

// Individual loading state card
function LoadingStateCard({ state }: { state: LoadingState }) {
  const getCategoryIcon = (category?: LoadingState['category']) => {
    switch (category) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'processing':
        return <FileText className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'auth':
        return <Shield className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const handleCancel = () => {
    if (state.onCancel) {
      state.onCancel();
    }
    LoadingStateManager.finishLoading(state.id);
  };

  return (
    <Card className="bg-white shadow-lg border">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 text-blue-600">
            {getCategoryIcon(state.category)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {state.message}
            </p>
            
            {typeof state.progress === 'number' && (
              <div className="mt-2">
                <Progress value={state.progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{state.progress}%</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              Started {formatRelativeTime(state.startTime)}
            </p>
          </div>

          {state.cancellable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Error states display component
export function ErrorStatesDisplay() {
  const errorStates = useErrorStates();

  if (errorStates.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 space-y-2 z-40 max-w-sm">
      {errorStates.map((state) => (
        <ErrorStateCard key={state.id} state={state} />
      ))}
    </div>
  );
}

// Individual error state card
function ErrorStateCard({ state }: { state: ErrorState }) {
  const getCategoryIcon = (category?: ErrorState['category']) => {
    switch (category) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'processing':
        return <FileText className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'auth':
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleRetry = () => {
    LoadingStateManager.retryError(state.id);
  };

  const handleDismiss = () => {
    LoadingStateManager.dismissError(state.id);
  };

  const canRetry = state.retryable && state.retryCount < state.maxRetries;

  return (
    <Alert variant="destructive" className="bg-white shadow-lg border-red-200">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-red-600">
          {getCategoryIcon(state.category)}
        </div>
        
        <div className="flex-1 min-w-0">
          {state.title && (
            <h4 className="text-sm font-medium text-red-900 mb-1">
              {state.title}
            </h4>
          )}
          
          <AlertDescription className="text-red-800">
            {state.message}
          </AlertDescription>
          
          {state.retryCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Retry {state.retryCount}/{state.maxRetries}
            </p>
          )}
          
          <p className="text-xs text-red-600 mt-1">
            {formatRelativeTime(state.timestamp)}
          </p>
          
          <div className="flex items-center space-x-2 mt-2">
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}

// Combined global display component
export function GlobalLoadingErrorDisplay() {
  return (
    <>
      <GlobalLoadingOverlay />
      <LoadingStatesDisplay />
      <ErrorStatesDisplay />
    </>
  );
}

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}