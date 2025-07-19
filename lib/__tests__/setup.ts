import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-firebase-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com'
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789'
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef'
process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-gemini-api-key'
process.env.NEXT_PUBLIC_GEMINI_MODEL = 'gemini-2.0-flash'
process.env.NEXT_PUBLIC_APP_ID = 'meeting-ai-mvp'

// Mock global variables that might be set in production
global.__app_id = 'meeting-ai-mvp'
global.__firebase_config = {
  apiKey: 'test-firebase-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef'
}
global.__initial_auth_token = undefined // Test anonymous auth by default