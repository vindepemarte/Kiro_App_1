#!/usr/bin/env node

// Test script to verify database functionality
// Use the compiled JavaScript file from the .next directory
const { getDatabaseService } = require('../.next/server/chunks/524');

async function testDatabase() {
  console.log('Testing database functionality...');
  
  try {
    // Get the database service
    const databaseService = getDatabaseService();
    console.log('Database service type:', databaseService.constructor.name);
    
    // Test a simple operation
    const testUser = {
      uid: 'test-user-' + Date.now(),
      email: 'test@example.com',
      displayName: 'Test User',
    };
    
    // Create a user profile
    await databaseService.createUserProfile(testUser.uid, {
      userId: testUser.uid,
      email: testUser.email,
      displayName: testUser.displayName,
      createdAt: new Date(),
    });
    console.log('Created test user profile');
    
    // Get the user profile
    const profile = await databaseService.getUserProfile(testUser.uid);
    console.log('Retrieved user profile:', profile);
    
    console.log('Database functionality test completed successfully');
  } catch (error) {
    console.error('Database functionality test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase();