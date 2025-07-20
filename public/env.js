
window.__ENV = {
  "NEXT_PUBLIC_FIREBASE_API_KEY": "",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET": "",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "",
  "NEXT_PUBLIC_FIREBASE_APP_ID": "",
  "NEXT_PUBLIC_GEMINI_API_KEY": "",
  "NEXT_PUBLIC_GEMINI_MODEL": "gemini-2.0-flash",
  "NEXT_PUBLIC_APP_ID": "meeting-ai-mvp",
  "NODE_ENV": "production"
};
console.log('Environment variables injected:', Object.keys(window.__ENV));

// Add debugging info
if (Object.keys(window.__ENV).some(key => !window.__ENV[key] && key.includes('FIREBASE'))) {
  console.warn('⚠️ Some Firebase environment variables are missing. Authentication may not work properly.');
  console.log('Visit /debug.html to see available environment variables');
}
