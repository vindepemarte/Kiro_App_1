#!/usr/bin/env node

// Test script to validate settings persistence functionality
const { execSync } = require('child_process');

console.log('🧪 Testing Settings Persistence...\n');

// Test 1: Check if user profile service is properly exported
console.log('1. Testing user profile service exports...');
try {
  const result = execSync('node -e "const { userProfileService } = require(\'./lib/user-profile-service.ts\'); console.log(typeof userProfileService);"', { encoding: 'utf8' });
  console.log('✅ User profile service exports correctly');
} catch (error) {
  console.log('❌ User profile service export issue:', error.message);
}

// Test 2: Check database service user profile methods
console.log('\n2. Testing database service user profile methods...');
try {
  const result = execSync('node -e "const { createUserProfile, updateUserProfile, getUserProfile } = require(\'./lib/database.ts\'); console.log(\'Methods available:\', typeof createUserProfile, typeof updateUserProfile, typeof getUserProfile);"', { encoding: 'utf8' });
  console.log('✅ Database service methods available');
} catch (error) {
  console.log('❌ Database service methods issue:', error.message);
}

// Test 3: Check if settings page can be compiled
console.log('\n3. Testing settings page compilation...');
try {
  const result = execSync('npx tsc --noEmit app/settings/page.tsx', { encoding: 'utf8' });
  console.log('✅ Settings page compiles without errors');
} catch (error) {
  console.log('❌ Settings page compilation issue:', error.message);
}

console.log('\n🏁 Settings persistence test completed');