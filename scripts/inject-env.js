#!/usr/bin/env node

// Script to inject environment variables into the Next.js build
// This ensures environment variables are available at runtime in production

const fs = require('fs');
const path = require('path');

// Helper function to get environment variable with multiple possible names
function getEnvVar(primaryKey, fallbackKey, defaultValue = '') {
  return process.env[primaryKey] || process.env[fallbackKey] || defaultValue;
}

const envVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
  NEXT_PUBLIC_FIREBASE_APP_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID'),
  NEXT_PUBLIC_GEMINI_API_KEY: getEnvVar('NEXT_PUBLIC_GEMINI_API_KEY', 'GEMINI_API_KEY'),
  NEXT_PUBLIC_GEMINI_MODEL: getEnvVar('NEXT_PUBLIC_GEMINI_MODEL', 'GEMINI_MODEL', 'gemini-2.0-flash'),
  NEXT_PUBLIC_APP_ID: getEnvVar('NEXT_PUBLIC_APP_ID', 'APP_ID', 'meeting-ai-mvp'),
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// Create the environment injection script
const envScript = `
window.__ENV = ${JSON.stringify(envVars, null, 2)};
console.log('Environment variables injected:', Object.keys(window.__ENV));
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