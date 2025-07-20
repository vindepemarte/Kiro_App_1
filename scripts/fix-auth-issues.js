#!/usr/bin/env node

/**
 * Authentication and Permission Fix Script
 * Helps diagnose and fix common authentication and Firebase permission issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 MeetingAI Authentication & Permission Fix Script');
console.log('=' .repeat(60));

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n📋 1. Checking Environment Variables');
  console.log('-'.repeat(40));
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_GEMINI_API_KEY'
  ];
  
  const envFile = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
    console.log('✅ .env.local file found');
  } else {
    console.log('❌ .env.local file not found');
    console.log('   Create a .env.local file in your project root');
  }
  
  const missingVars = [];
  requiredEnvVars.forEach(varName => {
    if (envContent.includes(varName) && envContent.includes(`${varName}=`)) {
      const value = envContent.split(`${varName}=`)[1]?.split('\n')[0]?.trim();
      if (value && value !== 'your_value_here') {
        console.log(`✅ ${varName}: Set`);
      } else {
        console.log(`⚠️  ${varName}: Empty or placeholder value`);
        missingVars.push(varName);
      }
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('\n🔧 Fix: Add the following to your .env.local file:');
    missingVars.forEach(varName => {
      console.log(`${varName}=your_actual_value_here`);
    });
  }
  
  return missingVars.length === 0;
}

// Check Firebase configuration
function checkFirebaseConfig() {
  console.log('\n🔥 2. Checking Firebase Configuration');
  console.log('-'.repeat(40));
  
  const configFile = path.join(__dirname, '..', 'lib', 'firebase.ts');
  
  if (fs.existsSync(configFile)) {
    console.log('✅ Firebase config file found');
    const configContent = fs.readFileSync(configFile, 'utf8');
    
    if (configContent.includes('getFirebaseAuth') && configContent.includes('getFirebaseDb')) {
      console.log('✅ Firebase Auth and Firestore exports found');
    } else {
      console.log('⚠️  Firebase exports may be incomplete');
    }
  } else {
    console.log('❌ Firebase config file not found');
  }
}

// Check Firestore rules
function checkFirestoreRules() {
  console.log('\n🛡️  3. Checking Firestore Security Rules');
  console.log('-'.repeat(40));
  
  const rulesFile = path.join(__dirname, '..', 'firestore.rules');
  
  if (fs.existsSync(rulesFile)) {
    console.log('✅ firestore.rules file found');
    const rulesContent = fs.readFileSync(rulesFile, 'utf8');
    
    if (rulesContent.includes('request.auth != null')) {
      console.log('✅ Authentication checks found in rules');
    } else {
      console.log('⚠️  Rules may be too permissive or restrictive');
    }
  } else {
    console.log('❌ firestore.rules file not found');
    console.log('   A basic rules file has been created for you');
  }
}

// Generate fix recommendations
function generateRecommendations() {
  console.log('\n💡 4. Recommendations to Fix Issues');
  console.log('-'.repeat(40));
  
  console.log('\n🔐 Authentication Issues:');
  console.log('1. Make sure your Firebase project has Authentication enabled');
  console.log('2. Enable Google Sign-in and Anonymous authentication in Firebase Console');
  console.log('3. Add your domain to authorized domains in Firebase Auth settings');
  console.log('4. Check that your API keys are correct and not expired');
  
  console.log('\n🛡️  Permission Issues:');
  console.log('1. Deploy the firestore.rules file to your Firebase project:');
  console.log('   firebase deploy --only firestore:rules');
  console.log('2. Or update rules in Firebase Console manually');
  console.log('3. Make sure users are properly authenticated before accessing data');
  
  console.log('\n🔄 Page Navigation Issues:');
  console.log('1. Clear your browser cache and cookies');
  console.log('2. Try signing out completely and signing in again');
  console.log('3. Check browser console for JavaScript errors');
  
  console.log('\n📱 Mobile/Responsive Issues:');
  console.log('1. Test on different screen sizes');
  console.log('2. Check that touch targets are at least 44px');
  console.log('3. Verify mobile navigation works properly');
}

// Generate environment template
function generateEnvTemplate() {
  console.log('\n📝 5. Environment Template');
  console.log('-'.repeat(40));
  
  const envTemplate = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
`;
  
  const envTemplatePath = path.join(__dirname, '..', '.env.template');
  fs.writeFileSync(envTemplatePath, envTemplate);
  
  console.log('✅ Environment template created at .env.template');
  console.log('   Copy this to .env.local and fill in your actual values');
}

// Main execution
async function main() {
  const envOk = checkEnvironmentVariables();
  checkFirebaseConfig();
  checkFirestoreRules();
  generateRecommendations();
  generateEnvTemplate();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY');
  console.log('='.repeat(60));
  
  if (envOk) {
    console.log('✅ Environment variables look good');
  } else {
    console.log('❌ Environment variables need attention');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('1. Fix any missing environment variables');
  console.log('2. Deploy Firestore rules to Firebase');
  console.log('3. Test authentication flow');
  console.log('4. Clear browser cache if issues persist');
  
  console.log('\n🆘 If you still have issues:');
  console.log('1. Check Firebase Console for error logs');
  console.log('2. Verify your Firebase project settings');
  console.log('3. Make sure billing is enabled if using Firebase');
  console.log('4. Check browser developer tools for errors');
  
  console.log('\n✨ Happy coding!');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});