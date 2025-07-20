import { useState, useCallback, useRef } from 'react';
import { ErrorHandler, retryOperation, RetryOptions } from '@/lib/error-handler';

export interface AsyncOperationState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
  lastAttempt: Date | null;
}

export interface AsyncOperationOptions extends RetryOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  resetOnNewOperation?: boolean;
}

export interface AsyncOperationResult<T = any> {
  state: AsyncOperationState<T>;
  execute: (operation: () => Promise<T>, options?: AsyncOperationOptions) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
}

export function useAsyncOperation<T = any>(
  defaultOptions?: AsyncOperationOptions
): AsyncOperationResult<T> {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastAttempt: null,
  });

  const lastOperationRef = useRef<{
    operation: () => Promise<T>;
    options?: AsyncOperationOptions;
  } | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: AsyncOperationOptions
  ): Promise<T | null> => {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Store the operation for retry functionality
    lastOperationRef.current = { operation, options: mergedOptions };

    // Reset state if requested
    if (mergedOptions.resetOnNewOperation !== false) {
      setState(prev => ({
        ...prev,
        data: null,
        error: null,
        retryCount: 0,
      }));
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      lastAttempt: new Date(),
    }));

    try {
      const result = await retryOperation(operation, {
        maxRetries: mergedOptions.maxRetries || 3,
        baseDelay: mergedOptions.baseDelay || 1000,
        maxDelay: mergedOptions.maxDelay || 10000,
        backoffFactor: mergedOptions.backoffFactor || 2,
        retryCondition: mergedOptions.retryCondition,
      });

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
      }));

      // Call success callback
      if (mergedOptions.onSuccess) {
        mergedOptions.onSuccess(result);
      }

      return result;
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: appError.userMessage,
        retryCount: prev.retryCount + 1,
      }));

      // Call error callback
      if (mergedOptions.onError) {
        mergedOptions.onError(appError);
      }

      return null;
    }
  }, [defaultOptions]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastOperationRef.current) {
      console.warn('No operation to retry');
      return null;
    }

    const { operation, options } = lastOperationRef.current;
    return execute(operation, { ...options, resetOnNewOperation: false });
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
      lastAttempt: null,
    });
    lastOperationRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    state,
    execute,
    retry,
    reset,
    clearError,
  };
}

// Specialized hook for data fetching with caching
export interface DataFetchOptions<T> extends AsyncOperationOptions {
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

export interface DataFetchResult<T> extends AsyncOperationResult<T> {
  refetch: () => Promise<T | null>;
  isStale: boolean;
}

const dataCache = new Map<string, { data: any; timestamp: number }>();

export function useDataFetch<T>(
  fetcher: () => Promise<T>,
  options?: DataFetchOptions<T>
): DataFetchResult<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    ...asyncOptions
  } = options || {};

  const asyncOperation = useAsyncOperation<T>(asyncOptions);

  // Check if cached data is stale
  const isStale = React.useMemo(() => {
    if (!cacheKey || !dataCache.has(cacheKey)) return true;
    
    const cached = dataCache.get(cacheKey)!;
    return Date.now() - cached.timestamp > cacheDuration;
  }, [cacheKey, cacheDuration]);

  // Enhanced fetcher that handles caching
  const cachedFetcher = useCallback(async (): Promise<T> => {
    // Check cache first
    if (cacheKey && !isStale) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    // Fetch fresh data
    const result = await fetcher();

    // Cache the result
    if (cacheKey) {
      dataCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }, [fetcher, cacheKey, isStale]);

  // Auto-fetch on mount
  React.useEffect(() => {
    if (refetchOnMount && !asyncOperation.state.loading) {
      asyncOperation.execute(cachedFetcher);
    }
  }, [refetchOnMount]); // Only run on mount

  // Refetch on window focus
  React.useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale && !asyncOperation.state.loading) {
        asyncOperation.execute(cachedFetcher);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, asyncOperation.state.loading]);

  const refetch = useCallback(() => {
    // Clear cache for this key
    if (cacheKey) {
      dataCache.delete(cacheKey);
    }
    return asyncOperation.execute(cachedFetcher);
  }, [cacheKey, cachedFetcher, asyncOperation.execute]);

  return {
    ...asyncOperation,
    refetch,
    isStale,
  };
}

// Hook for managing multiple async operations
export interface MultiAsyncOperationState {
  [key: string]: AsyncOperationState;
}

export interface MultiAsyncOperationResult {
  states: MultiAsyncOperationState;
  execute: (key: string, operation: () => Promise<any>, options?: AsyncOperationOptions) => Promise<any>;
  retry: (key: string) => Promise<any>;
  reset: (key?: string) => void;
  clearError: (key: string) => void;
  isAnyLoading: boolean;
  hasAnyError: boolean;
}

export function useMultiAsyncOperation(): MultiAsyncOperationResult {
  const [states, setStates] = useState<MultiAsyncOperationState>({});
  const operationsRef = useRef<{
    [key: string]: {
      operation: () => Promise<any>;
      options?: AsyncOperationOptions;
    };
  }>({});

  const execute = useCallback(async (
    key: string,
    operation: () => Promise<any>,
    options?: AsyncOperationOptions
  ) => {
    // Store operation for retry
    operationsRef.current[key] = { operation, options };

    // Initialize state if not exists
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        loading: true,
        error: null,
        lastAttempt: new Date(),
      }
    }));

    try {
      const result = await retryOperation(operation, {
        maxRetries: options?.maxRetries || 3,
        baseDelay: options?.baseDelay || 1000,
        maxDelay: options?.maxDelay || 10000,
        backoffFactor: options?.backoffFactor || 2,
        retryCondition: options?.retryCondition,
      });

      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          data: result,
          loading: false,
          error: null,
        }
      }));

      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: appError.userMessage,
          retryCount: (prev[key]?.retryCount || 0) + 1,
        }
      }));

      if (options?.onError) {
        options.onError(appError);
      }

      throw appError;
    }
  }, []);

  const retry = useCallback(async (key: string) => {
    const storedOperation = operationsRef.current[key];
    if (!storedOperation) {
      console.warn(`No operation to retry for key: ${key}`);
      return null;
    }

    return execute(key, storedOperation.operation, storedOperation.options);
  }, [execute]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setStates(prev => {
        const newStates = { ...prev };
        delete newStates[key];
        return newStates;
      });
      delete operationsRef.current[key];
    } else {
      setStates({});
      operationsRef.current = {};
    }
  }, []);

  const clearError = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error: null,
      }
    }));
  }, []);

  const isAnyLoading = React.useMemo(() => {
    return Object.values(states).some(state => state.loading);
  }, [states]);

  const hasAnyError = React.useMemo(() => {
    return Object.values(states).some(state => state.error);
  }, [states]);

  return {
    states,
    execute,
    retry,
    reset,
    clearError,
    isAnyLoading,
    hasAnyError,
  };
}