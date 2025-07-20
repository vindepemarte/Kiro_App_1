// Centralized loading state management for the application

import { useState, useEffect } from 'react';

export interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
  startTime: Date;
  category?: 'upload' | 'processing' | 'database' | 'network' | 'auth' | 'general';
}

export interface ErrorState {
  id: string;
  message: string;
  title?: string;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  category?: 'upload' | 'processing' | 'database' | 'network' | 'auth' | 'general';
  timestamp: Date;
}

// Simple global state management without external dependencies
class SimpleStateManager {
  private loadingStates = new Map<string, LoadingState>();
  private errorStates = new Map<string, ErrorState>();
  private globalLoading = false;
  private globalLoadingMessage = '';
  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Loading state methods
  addLoadingState(state: Omit<LoadingState, 'startTime'>) {
    this.loadingStates.set(state.id, {
      ...state,
      startTime: new Date(),
    });
    this.notify();
  }

  updateLoadingState(id: string, updates: Partial<LoadingState>) {
    const existing = this.loadingStates.get(id);
    if (existing) {
      this.loadingStates.set(id, { ...existing, ...updates });
      this.notify();
    }
  }

  removeLoadingState(id: string) {
    this.loadingStates.delete(id);
    this.notify();
  }

  clearAllLoadingStates() {
    this.loadingStates.clear();
    this.notify();
  }

  getLoadingStates(): LoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  // Error state methods
  addErrorState(state: Omit<ErrorState, 'timestamp'>) {
    this.errorStates.set(state.id, {
      ...state,
      timestamp: new Date(),
    });
    this.notify();
  }

  updateErrorState(id: string, updates: Partial<ErrorState>) {
    const existing = this.errorStates.get(id);
    if (existing) {
      this.errorStates.set(id, { ...existing, ...updates });
      this.notify();
    }
  }

  removeErrorState(id: string) {
    this.errorStates.delete(id);
    this.notify();
  }

  clearAllErrorStates() {
    this.errorStates.clear();
    this.notify();
  }

  getErrorStates(): ErrorState[] {
    return Array.from(this.errorStates.values());
  }

  // Global loading methods
  setGlobalLoading(loading: boolean, message = '') {
    this.globalLoading = loading;
    this.globalLoadingMessage = message;
    this.notify();
  }

  getGlobalLoading() {
    return {
      isLoading: this.globalLoading,
      message: this.globalLoadingMessage,
    };
  }

  // Computed states
  isLoading() {
    return this.loadingStates.size > 0;
  }

  hasErrors() {
    return this.errorStates.size > 0;
  }
}

const stateManager = new SimpleStateManager();

// Helper functions for common loading patterns
export class LoadingStateManager {
  private static generateId(): string {
    return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static startLoading(
    message: string,
    options?: {
      id?: string;
      category?: LoadingState['category'];
      progress?: number;
      cancellable?: boolean;
      onCancel?: () => void;
    }
  ): string {
    const id = options?.id || this.generateId();
    
    stateManager.addLoadingState({
      id,
      message,
      category: options?.category || 'general',
      progress: options?.progress,
      cancellable: options?.cancellable,
      onCancel: options?.onCancel,
    });

    return id;
  }

  static updateLoading(id: string, updates: Partial<LoadingState>): void {
    stateManager.updateLoadingState(id, updates);
  }

  static finishLoading(id: string): void {
    stateManager.removeLoadingState(id);
  }

  static addError(
    message: string,
    options?: {
      id?: string;
      title?: string;
      category?: ErrorState['category'];
      retryable?: boolean;
      maxRetries?: number;
      onRetry?: () => void;
      onDismiss?: () => void;
    }
  ): string {
    const id = options?.id || this.generateId();
    
    stateManager.addErrorState({
      id,
      message,
      title: options?.title,
      category: options?.category || 'general',
      retryable: options?.retryable || false,
      retryCount: 0,
      maxRetries: options?.maxRetries || 3,
      onRetry: options?.onRetry,
      onDismiss: options?.onDismiss,
    });

    return id;
  }

  static retryError(id: string): void {
    const errorStates = stateManager.getErrorStates();
    const error = errorStates.find(e => e.id === id);
    
    if (error && error.onRetry) {
      stateManager.updateErrorState(id, {
        retryCount: error.retryCount + 1,
      });
      error.onRetry();
    }
  }

  static dismissError(id: string): void {
    const errorStates = stateManager.getErrorStates();
    const error = errorStates.find(e => e.id === id);
    
    if (error?.onDismiss) {
      error.onDismiss();
    }
    
    stateManager.removeErrorState(id);
  }
}

// React hooks for using the loading state store
export function useLoadingStates(): LoadingState[] {
  const [states, setStates] = useState<LoadingState[]>([]);

  useEffect(() => {
    const updateStates = () => {
      setStates(stateManager.getLoadingStates());
    };

    updateStates();
    const unsubscribe = stateManager.subscribe(updateStates);
    return unsubscribe;
  }, []);

  return states;
}

export function useErrorStates(): ErrorState[] {
  const [states, setStates] = useState<ErrorState[]>([]);

  useEffect(() => {
    const updateStates = () => {
      setStates(stateManager.getErrorStates());
    };

    updateStates();
    const unsubscribe = stateManager.subscribe(updateStates);
    return unsubscribe;
  }, []);

  return states;
}

export function useIsLoading(): boolean {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateLoading = () => {
      setIsLoading(stateManager.isLoading());
    };

    updateLoading();
    const unsubscribe = stateManager.subscribe(updateLoading);
    return unsubscribe;
  }, []);

  return isLoading;
}

export function useHasErrors(): boolean {
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    const updateErrors = () => {
      setHasErrors(stateManager.hasErrors());
    };

    updateErrors();
    const unsubscribe = stateManager.subscribe(updateErrors);
    return unsubscribe;
  }, []);

  return hasErrors;
}

export function useGlobalLoading() {
  const [globalState, setGlobalState] = useState({ isLoading: false, message: '' });

  useEffect(() => {
    const updateGlobalState = () => {
      setGlobalState(stateManager.getGlobalLoading());
    };

    updateGlobalState();
    const unsubscribe = stateManager.subscribe(updateGlobalState);
    return unsubscribe;
  }, []);

  return {
    ...globalState,
    setLoading: (loading: boolean, message?: string) => {
      stateManager.setGlobalLoading(loading, message);
    }
  };
}