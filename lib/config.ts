// Configuration interfaces and utilities

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface AppConfig {
  firebase: FirebaseConfig;
  gemini: GeminiConfig;
  appId: string;
}

// Global variable declarations for runtime configuration
declare global {
  interface Window {
    __app_id?: string;
    __firebase_config?: FirebaseConfig;
    __initial_auth_token?: string;
  }
  
  var __app_id: string | undefined;
  var __firebase_config: FirebaseConfig | undefined;
  var __initial_auth_token: string | undefined;
}

// Get configuration with global variable support
export function getAppConfig(): AppConfig {
  // Check for global variables first (runtime configuration override)
  // Support both browser (window) and Node.js (global) environments
  const globalFirebaseConfig = (typeof window !== 'undefined' ? window.__firebase_config : global.__firebase_config) || undefined;
  const globalAppId = (typeof window !== 'undefined' ? window.__app_id : global.__app_id) || undefined;

  const firebaseConfig: FirebaseConfig = globalFirebaseConfig || {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  const geminiConfig: GeminiConfig = {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    model: process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash',
  };

  const appId = globalAppId || process.env.NEXT_PUBLIC_APP_ID || 'meeting-ai-mvp';

  return {
    firebase: firebaseConfig,
    gemini: geminiConfig,
    appId,
  };
}

// Validate configuration
export function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Firebase config
  if (!config.firebase.apiKey) errors.push('Firebase API key is missing');
  if (!config.firebase.authDomain) errors.push('Firebase auth domain is missing');
  if (!config.firebase.projectId) errors.push('Firebase project ID is missing');
  if (!config.firebase.storageBucket) errors.push('Firebase storage bucket is missing');
  if (!config.firebase.messagingSenderId) errors.push('Firebase messaging sender ID is missing');
  if (!config.firebase.appId) errors.push('Firebase app ID is missing');

  // Validate Gemini config
  if (!config.gemini.apiKey) errors.push('Gemini API key is missing');
  if (!config.gemini.model) errors.push('Gemini model is missing');

  // Validate app config
  if (!config.appId) errors.push('App ID is missing');

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Get initial auth token from global variable
export function getInitialAuthToken(): string | undefined {
  return typeof window !== 'undefined' ? window.__initial_auth_token : global.__initial_auth_token;
}