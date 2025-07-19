// Runtime environment variable handler for production deployments

export function getEnvVar(key: string, fallback: string = ''): string {
  // Try to get from process.env first (build time and server runtime)
  if (typeof process !== 'undefined' && process.env[key]) {
    return process.env[key];
  }
  
  // Try to get from window (client runtime)
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV[key]) {
    return (window as any).__ENV[key];
  }
  
  return fallback;
}

export function getFirebaseConfig() {
  return {
    apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
  };
}

export function getGeminiConfig() {
  return {
    apiKey: getEnvVar('NEXT_PUBLIC_GEMINI_API_KEY') || getEnvVar('GEMINI_API_KEY'),
    model: getEnvVar('NEXT_PUBLIC_GEMINI_MODEL', 'gemini-2.0-flash'),
  };
}

export function getAppConfig() {
  return {
    appId: getEnvVar('NEXT_PUBLIC_APP_ID', 'meeting-ai-mvp'),
  };
}