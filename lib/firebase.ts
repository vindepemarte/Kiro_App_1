// Firebase initialization and configuration

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Get Firebase configuration from environment or global variables
function getFirebaseConfig() {
  // Check for global configuration first (for runtime injection)
  if (typeof window !== 'undefined' && (window as any).__firebase_config) {
    return (window as any).__firebase_config;
  }

  // Check for injected environment variables
  if (typeof window !== 'undefined' && (window as any).__ENV) {
    const env = (window as any).__ENV;
    return {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }

  // Fallback to process.env
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initializeFirebase() {
  // Skip during build time
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  try {
    const config = getFirebaseConfig();
    
    // Validate required fields
    if (!config.apiKey || !config.projectId) {
      throw new Error('Missing required Firebase configuration');
    }

    // Initialize app if not already done
    if (!app) {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        app = initializeApp(config);
      }
    }

    // Initialize services
    if (!auth && app) {
      auth = getAuth(app);
    }

    if (!db && app) {
      db = getFirestore(app);
    }

    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

// Export getters
export function getFirebaseApp(): FirebaseApp {
  const { app } = initializeFirebase();
  if (!app) throw new Error('Firebase app not initialized');
  return app;
}

export function getFirebaseAuth(): Auth {
  const { auth } = initializeFirebase();
  if (!auth) throw new Error('Firebase auth not initialized');
  return auth;
}

export function getFirebaseDb(): Firestore {
  const { db } = initializeFirebase();
  if (!db) throw new Error('Firebase db not initialized');
  return db;
}