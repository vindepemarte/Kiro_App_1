// Firebase initialization and configuration

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Get Firebase configuration from environment or global variables
function getFirebaseConfig() {
  console.log('🔧 Loading Firebase configuration...');
  
  // Check for global configuration first (for runtime injection)
  if (typeof window !== 'undefined' && (window as any).__firebase_config) {
    console.log('✅ Using global __firebase_config');
    return (window as any).__firebase_config;
  }

  // Check for injected environment variables
  if (typeof window !== 'undefined' && (window as any).__ENV) {
    const env = (window as any).__ENV;
    console.log('✅ Using injected __ENV variables');
    console.log('Available ENV keys:', Object.keys(env));
    
    const config = {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    console.log('Firebase config loaded:', {
      apiKey: config.apiKey ? '✅ Present' : '❌ Missing',
      authDomain: config.authDomain ? '✅ Present' : '❌ Missing',
      projectId: config.projectId ? '✅ Present' : '❌ Missing',
      storageBucket: config.storageBucket ? '✅ Present' : '❌ Missing',
      messagingSenderId: config.messagingSenderId ? '✅ Present' : '❌ Missing',
      appId: config.appId ? '✅ Present' : '❌ Missing',
    });
    
    return config;
  }

  // Fallback to process.env (for development)
  console.log('⚠️ Falling back to process.env');
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  
  console.log('Process.env config loaded:', {
    apiKey: config.apiKey ? '✅ Present' : '❌ Missing',
    authDomain: config.authDomain ? '✅ Present' : '❌ Missing',
    projectId: config.projectId ? '✅ Present' : '❌ Missing',
    storageBucket: config.storageBucket ? '✅ Present' : '❌ Missing',
    messagingSenderId: config.messagingSenderId ? '✅ Present' : '❌ Missing',
    appId: config.appId ? '✅ Present' : '❌ Missing',
  });
  
  return config;
}

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initializeFirebase() {
  // Skip during build time or if we have demo credentials
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  try {
    const config = getFirebaseConfig();
    
    // Enhanced validation with better error messages
    if (!config.apiKey) {
      console.error('❌ Firebase API Key is missing');
      console.error('Please check your environment variables in Coolify');
      throw new Error('Missing Firebase API Key - check environment variables');
    }
    
    if (!config.projectId) {
      console.error('❌ Firebase Project ID is missing');
      console.error('Please check your environment variables in Coolify');
      throw new Error('Missing Firebase Project ID - check environment variables');
    }

    console.log('✅ Firebase configuration validated successfully');

    // Initialize app if not already done
    if (!app) {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
        console.log('✅ Using existing Firebase app');
      } else {
        app = initializeApp(config);
        console.log('✅ Firebase app initialized successfully');
      }
    }

    // Initialize services
    if (!auth && app) {
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized');
    }

    if (!db && app) {
      db = getFirestore(app);
      console.log('✅ Firestore initialized');
    }

    return { app, auth, db };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.error('🔧 Troubleshooting steps:');
    console.error('1. Check /debug.html to verify environment variables');
    console.error('2. Ensure all Firebase environment variables are set in Coolify');
    console.error('3. Verify Firebase project configuration');
    throw error;
  }
}

// Export getters with build-time safety
export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase app cannot be initialized during build time');
  }
  const { app } = initializeFirebase();
  if (!app) throw new Error('Firebase app not initialized');
  return app;
}

export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase auth cannot be initialized during build time');
  }
  const { auth } = initializeFirebase();
  if (!auth) throw new Error('Firebase auth not initialized');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('Firebase db cannot be initialized during build time');
  }
  const { db } = initializeFirebase();
  if (!db) throw new Error('Firebase db not initialized');
  return db;
}