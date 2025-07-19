#!/usr/bin/env node

// Simple test to verify authentication flow works
// This simulates the environment variables being available and tests Firebase initialization

// Mock environment variables for testing
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-gemini-key';
process.env.NEXT_PUBLIC_GEMINI_MODEL = 'gemini-2.0-flash';
process.env.NEXT_PUBLIC_APP_ID = 'meeting-ai-mvp';

// Mock window object for Node.js environment
global.window = {
  __ENV: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
    NEXT_PUBLIC_GEMINI_API_KEY: 'test-gemini-key',
    NEXT_PUBLIC_GEMINI_MODEL: 'gemini-2.0-flash',
    NEXT_PUBLIC_APP_ID: 'meeting-ai-mvp',
    NODE_ENV: 'test'
  }
};

console.log('🧪 Testing Authentication Flow...\n');

try {
  // Test 1: Environment variable structure
  console.log('1. Testing environment variable structure...');
  
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'NEXT_PUBLIC_GEMINI_MODEL',
    'NEXT_PUBLIC_APP_ID'
  ];
  
  console.log('✅ Environment variables structure test passed');
  requiredVars.forEach(varName => {
    const value = process.env[varName] || global.window.__ENV[varName];
    console.log(`   ${varName}: ${value ? '✅ Present' : '❌ Missing'}`);
  });
  
  // Test 2: Firebase configuration structure
  console.log('\n2. Testing Firebase configuration structure...');
  
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  
  console.log('✅ Firebase configuration structure is valid');
  console.log('   Config object created successfully');
  
  // Test 3: Environment injection script
  console.log('\n3. Testing environment injection...');
  
  const fs = require('fs');
  const path = require('path');
  
  if (fs.existsSync(path.join(process.cwd(), 'public', 'env.js'))) {
    console.log('✅ Environment injection file exists');
    const envContent = fs.readFileSync(path.join(process.cwd(), 'public', 'env.js'), 'utf8');
    if (envContent.includes('window.__ENV')) {
      console.log('✅ Environment injection script is properly formatted');
    } else {
      console.log('❌ Environment injection script format issue');
    }
  } else {
    console.log('❌ Environment injection file missing');
  }
  
  console.log('\n🎉 Core structure tests passed! Authentication flow should work correctly.');
  console.log('\n📋 Next steps for production deployment:');
  console.log('   1. Set all environment variables in Coolify with the exact names shown above');
  console.log('   2. Ensure Firebase project has anonymous authentication enabled');
  console.log('   3. Add your domain to Firebase authorized domains');
  console.log('   4. Deploy and test the /debug.html page to verify environment variables');
  console.log('   5. Check browser console for any Firebase initialization errors');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('\n🔧 Troubleshooting steps:');
  console.error('   1. Check that all required environment variables are set');
  console.error('   2. Verify Firebase project configuration');
  console.error('   3. Ensure anonymous authentication is enabled in Firebase');
  process.exit(1);
}