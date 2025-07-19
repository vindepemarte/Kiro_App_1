// Firebase initialization and configuration

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAppConfig, validateConfig, FirebaseConfig } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Initialize Firebase with error handling
export function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  try {
    // Skip Firebase initialization during build time
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      // During build time, create mock instances to prevent errors
      throw new Error('Firebase initialization skipped during build time');
    }

    // Get configuration
    const config = getAppConfig();
    
    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Firebase configuration is invalid: ${validation.errors.join(', ')}`);
    }

    // Initialize Firebase app if not already initialized
    if (!app) {
      // Check if Firebase is already initialized
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        app = initializeApp(config.firebase);
      }
    }

    // Initialize Auth if not already initialized
    if (!auth) {
      auth = getAuth(app);
      
      // Connect to emulator in development if needed
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099');
        } catch (error) {
          // Emulator might already be connected, ignore error
          console.warn('Auth emulator connection failed:', error);
        }
      }
    }

    // Initialize Firestore if not already initialized
    if (!db) {
      db = getFirestore(app);
      
      // Connect to emulator in development if needed
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        try {
          connectFirestoreEmulator(db, 'localhost', 8080);
        } catch (error) {
          // Emulator might already be connected, ignore error
          console.warn('Firestore emulator connection failed:', error);
        }
      }
    }

    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Check if we're in a build environment
function isBuildTime(): boolean {
  return typeof window === 'undefined' && process.env.NODE_ENV === 'production';
}

// Get Firebase instances (initialize if needed)
export function getFirebaseInstances() {
  if (isBuildTime()) {
    throw new Error('Firebase not available during build time');
  }
  
  if (!app || !auth || !db) {
    return initializeFirebase();
  }
  return { app, auth, db };
}

// Reset Firebase instances (useful for testing)
export function resetFirebaseInstances() {
  app = null;
  auth = null;
  db = null;
}

// Export individual getters for convenience with build-time safety
export function getFirebaseApp(): FirebaseApp {
  if (isBuildTime()) {
    throw new Error('Firebase not available during build time');
  }
  const { app } = getFirebaseInstances();
  return app;
}

export function getFirebaseAuth(): Auth {
  if (isBuildTime()) {
    throw new Error('Firebase not available during build time');
  }
  const { auth } = getFirebaseInstances();
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (isBuildTime()) {
    throw new Error('Firebase not available during build time');
  }
  const { db } = getFirebaseInstances();
  return db;
}