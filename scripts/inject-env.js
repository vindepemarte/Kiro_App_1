#!/usr/bin/env node

// Script to inject environment variables into the Next.js build
// This ensures environment variables are available at runtime in production

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('📁 Loaded environment variables from .env.local');
  } else {
    console.log('⚠️  No .env.local file found, using process.env only');
  }
}

// Load environment variables first
loadEnvFile();

// Helper function to get environment variable with multiple possible names
function getEnvVar(primaryKey, fallbackKey, defaultValue = '') {
  return process.env[primaryKey] || process.env[fallbackKey] || defaultValue;
}

const envVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'demo-api-key'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'demo-project.firebaseapp.com'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'demo-project'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', 'demo-project.appspot.com'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', '123456789'),
  NEXT_PUBLIC_FIREBASE_APP_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID', '1:123456789:web:abcdef'),
  NEXT_PUBLIC_GEMINI_API_KEY: getEnvVar('NEXT_PUBLIC_GEMINI_API_KEY', 'GEMINI_API_KEY', 'demo-gemini-key'),
  NEXT_PUBLIC_GEMINI_MODEL: getEnvVar('NEXT_PUBLIC_GEMINI_MODEL', 'GEMINI_MODEL', 'gemini-2.0-flash'),
  NEXT_PUBLIC_APP_ID: getEnvVar('NEXT_PUBLIC_APP_ID', 'APP_ID', 'meeting-ai-mvp'),
  
  // Monitoring and logging configuration
  NEXT_PUBLIC_LOG_ENDPOINT: getEnvVar('NEXT_PUBLIC_LOG_ENDPOINT', 'LOG_ENDPOINT', ''),
  NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT: getEnvVar('NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT', 'ERROR_REPORTING_ENDPOINT', ''),
  NEXT_PUBLIC_ANALYTICS_ENDPOINT: getEnvVar('NEXT_PUBLIC_ANALYTICS_ENDPOINT', 'ANALYTICS_ENDPOINT', ''),
  NEXT_PUBLIC_MONITORING_ENABLED: getEnvVar('NEXT_PUBLIC_MONITORING_ENABLED', 'MONITORING_ENABLED', 'true'),
  NEXT_PUBLIC_LOG_LEVEL: getEnvVar('NEXT_PUBLIC_LOG_LEVEL', 'LOG_LEVEL', process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO'),
  
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// Create the environment injection script
const envScript = `
window.__ENV = ${JSON.stringify(envVars, null, 2)};
console.log('Environment variables injected:', Object.keys(window.__ENV));

// Add debugging info
if (Object.keys(window.__ENV).some(key => !window.__ENV[key] && key.includes('FIREBASE'))) {
  console.warn('⚠️ Some Firebase environment variables are missing. Authentication may not work properly.');
  console.log('Visit /debug.html to see available environment variables');
}
`;

// Write to public directory so it can be served
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'env.js'), envScript);

console.log('Environment variables injected successfully');
console.log('Available variables:', Object.keys(envVars).filter(key => envVars[key]));
console.log('Missing variables:', Object.keys(envVars).filter(key => !envVars[key]));

// Debug: Show all environment variables that start with relevant prefixes
const relevantEnvVars = Object.keys(process.env).filter(key => 
  key.startsWith('NEXT_PUBLIC_') || 
  key.startsWith('FIREBASE_') || 
  key.startsWith('GEMINI_') ||
  key === 'NODE_ENV'
);
console.log('All relevant environment variables found:', relevantEnvVars);