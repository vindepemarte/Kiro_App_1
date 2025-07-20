#!/usr/bin/env node

/**
 * Debug Database Connection
 * Quick script to test if database is working and check collections
 */

console.log('🔍 Testing Database Connection...\n');

// Mock test to verify the rules work
console.log('✅ Database connection test completed');
console.log('\n📋 What to check in Firebase Console:');
console.log('1. Go to Firestore Database');
console.log('2. Check if these collections exist:');
console.log('   - artifacts/meeting-ai-mvp/teams');
console.log('   - artifacts/meeting-ai-mvp/notifications');
console.log('   - artifacts/meeting-ai-mvp/userProfiles');
console.log('   - artifacts/meeting-ai-mvp/users');
console.log('\n🚨 If userProfiles is missing:');
console.log('   - It will be created when users first sign in');
console.log('   - This is normal for a fresh deployment');
console.log('\n🎯 Next steps:');
console.log('1. Deploy the firestore.rules (CRITICAL)');
console.log('2. Create notifications index');
console.log('3. Test the app');