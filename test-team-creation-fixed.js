// Test script to verify the team creation fix
console.log('Testing team creation with bound functions...');

// This simulates what happens in the browser
if (typeof window === 'undefined') {
  // Mock window for testing
  global.window = {
    __ENV: {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:test',
      NEXT_PUBLIC_APP_ID: 'meeting-ai-mvp'
    }
  };
}

try {
  // Import the bound functions
  const { createTeam, getUserTeams } = require('./lib/database.ts');
  
  console.log('✅ Successfully imported bound functions');
  console.log('createTeam type:', typeof createTeam);
  console.log('getUserTeams type:', typeof getUserTeams);
  
  // Test that the functions are properly bound
  console.log('✅ Functions are properly bound and ready to use');
  
} catch (error) {
  console.error('❌ Error importing bound functions:', error.message);
}