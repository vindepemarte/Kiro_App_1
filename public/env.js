
window.__ENV = {
  "NEXT_PUBLIC_FIREBASE_API_KEY": "AIzaSyAKk9FGSsfGcOQ4xFMShM_LCIivvRFpMB4",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "meeting-ai-a3c96.firebaseapp.com",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "meeting-ai-a3c96",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET": "meeting-ai-a3c96.firebasestorage.app",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "555994278594",
  "NEXT_PUBLIC_FIREBASE_APP_ID": "1:555994278594:web:c77bf1bfb106009a38295b",
  "NEXT_PUBLIC_GEMINI_API_KEY": "AIzaSyBpGhRD0V7H6y5d0hQFBT-7pOR8sGz9t-4",
  "NEXT_PUBLIC_GEMINI_MODEL": "gemini-2.0-flash",
  "NEXT_PUBLIC_APP_ID": "meeting-ai-mvp",
  "NEXT_PUBLIC_LOG_ENDPOINT": "",
  "NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT": "",
  "NEXT_PUBLIC_ANALYTICS_ENDPOINT": "",
  "NEXT_PUBLIC_MONITORING_ENABLED": "true",
  "NEXT_PUBLIC_LOG_LEVEL": "INFO",
  "NODE_ENV": "production"
};
console.log('Environment variables injected:', Object.keys(window.__ENV));

// Add debugging info
if (Object.keys(window.__ENV).some(key => !window.__ENV[key] && key.includes('FIREBASE'))) {
  console.warn('⚠️ Some Firebase environment variables are missing. Authentication may not work properly.');
  console.log('Visit /debug.html to see available environment variables');
}
