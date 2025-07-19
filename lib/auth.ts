// Authentication service with Firebase Auth integration

import { 
  signInAnonymously, 
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { getInitialAuthToken } from './config';
import { User, AuthState } from './types';

export class AuthService {
  private _auth: Auth | null = null;
  private currentUser: User | null = null;

  private get auth(): Auth {
    if (!this._auth) {
      try {
        this._auth = getFirebaseAuth();
      } catch (error) {
        console.error('Failed to get Firebase Auth:', error);
        throw error;
      }
    }
    return this._auth;
  }

  constructor() {
    // Initialize lazily when needed
  }

  // Get initial auth token from config
  getInitialAuthToken(): string | null {
    return getInitialAuthToken();
  }

  // Initialize authentication with custom token or anonymous auth
  async initializeAuth(): Promise<User | null> {
    try {
      const initialToken = getInitialAuthToken();
      
      if (initialToken) {
        // Use custom token authentication
        const credential = await signInWithCustomToken(this.auth, initialToken);
        return this.mapFirebaseUser(credential.user);
      } else {
        // Use anonymous authentication
        const credential = await signInAnonymously(this.auth);
        return this.mapFirebaseUser(credential.user);
      }
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Get current authenticated user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Sign out current user
  async signOutUser(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(this.auth, (firebaseUser) => {
      const user = firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
      this.currentUser = user;
      callback(user);
    });

    return unsubscribe;
  }

  // Sign in anonymously
  async signInAnonymously(): Promise<User> {
    try {
      console.log('Attempting anonymous sign-in...');
      const result = await signInAnonymously(this.auth);
      console.log('Anonymous sign-in successful:', result.user.uid);
      const user = this.mapFirebaseUser(result.user);
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      throw error;
    }
  }

  // Re-authenticate with custom token
  async reauthenticateWithCustomToken(token: string): Promise<User> {
    try {
      const credential = await signInWithCustomToken(this.auth, token);
      return this.mapFirebaseUser(credential.user);
    } catch (error) {
      console.error('Re-authentication failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Re-authenticate anonymously
  async reauthenticateAnonymously(): Promise<User> {
    try {
      const credential = await signInAnonymously(this.auth);
      return this.mapFirebaseUser(credential.user);
    } catch (error) {
      console.error('Anonymous re-authentication failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      return this.mapFirebaseUser(credential.user);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return this.mapFirebaseUser(credential.user);
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Create account with email and password
  async createAccountWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      return this.mapFirebaseUser(credential.user);
    } catch (error) {
      console.error('Account creation failed:', error);
      throw new Error(this.getAuthErrorMessage(error));
    }
  }

  // Private helper methods
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAnonymous: firebaseUser.isAnonymous,
      customClaims: (firebaseUser as any).customClaims || undefined,
    };
  }



  private getAuthErrorMessage(error: any): string {
    if (typeof error === 'object' && error !== null) {
      // Firebase auth error codes
      switch (error.code) {
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection and try again.';
        case 'auth/too-many-requests':
          return 'Too many authentication attempts. Please try again later.';
        case 'auth/user-disabled':
          return 'This account has been disabled. Please contact support.';
        case 'auth/invalid-custom-token':
          return 'Invalid authentication token. Please refresh and try again.';
        case 'auth/custom-token-mismatch':
          return 'Authentication token mismatch. Please refresh and try again.';
        case 'auth/operation-not-allowed':
          return 'Authentication method not enabled. Please contact support.';
        default:
          return error.message || 'Authentication failed. Please try again.';
      }
    }
    return 'Authentication failed. Please try again.';
  }
}

// Create singleton instance
export const authService = new AuthService();