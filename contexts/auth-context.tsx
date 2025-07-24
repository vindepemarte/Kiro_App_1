'use client';

// Authentication context for React state management

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '@/lib/auth';
import { User, AuthState } from '@/lib/types';
import { AuthError, AuthLoading } from '@/components/auth-error';
import { userProfileConsistencyService } from '@/lib/user-profile-consistency';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  reauthenticate: (token?: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Initialize authentication on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Set up auth state listener
        const unsubscribe = authService.onAuthStateChanged(async (user) => {
          if (mounted) {
            // If user signed in, ensure their profile exists
            if (user && !user.isAnonymous) {
              try {
                // Use the dedicated API endpoint for profile creation
                const response = await fetch('/api/auth/create-profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ user }),
                });
                
                if (!response.ok) {
                  console.warn('Failed to create user profile via API');
                }
              } catch (error) {
                console.warn('Failed to ensure user profile:', error);
                // Don't fail auth if profile creation fails
              }
            }

            setAuthState(prev => ({
              ...prev,
              user,
              loading: false,
              error: null,
            }));
          }
        });

        // Try to authenticate - don't auto sign in anonymously
        const initialToken = authService.getInitialAuthToken();
        if (initialToken) {
          await authService.reauthenticateWithCustomToken(initialToken);
        }
        // Don't automatically sign in anonymously - let user choose

        return unsubscribe;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
          }));
        }
        return () => {};
      }
    };

    const unsubscribePromise = initAuth();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsubscribe => unsubscribe());
    };
  }, []);

  // Sign out function
  const signOut = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.signOutUser();
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
      throw error;
    }
  };

  // Re-authenticate function
  const reauthenticate = async (token?: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      if (token) {
        await authService.reauthenticateWithCustomToken(token);
      } else {
        await authService.reauthenticateAnonymously();
      }
    } catch (error) {
      console.error('Re-authentication error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Re-authentication failed',
      }));
      throw error;
    }
  };

  // Initialize auth function (for manual retry)
  const initializeAuth = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.initializeAuth();
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication initialization failed',
      }));
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    reauthenticate,
    initializeAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
interface WithAuthProps {
  fallback?: ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, error, initializeAuth } = useAuth();

    if (loading) {
      return <AuthLoading />;
    }

    if (error) {
      return <AuthError error={error} onRetry={initializeAuth} />;
    }

    if (!user) {
      return options.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">Please sign in to continue</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}