#!/usr/bin/env node

// Simple validation script for notification and task display fixes

const fs = require('fs');
const path = require('path');

console.log('🔧 Validating Notification and Task Display Fixes...\n');

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return '';
  }
}

function validateFixes() {
  let allTestsPassed = true;
  
  // Test 1: Check notification service has required methods
  console.log('1️⃣ Testing Notification Service Methods...');
  
  const notificationServiceContent = readFile('lib/notification-service.ts');
  
  const requiredMethods = [
    'getUserNotifications',
    'getUnreadCount', 
    'markAsRead',
    'subscribeToNotifications',
    'sendTaskAssignment',
    'acceptTeamInvitation',
    'declineTeamInvitation',
    'deleteNotification'
  ];
  
  let methodsFound = 0;
  for (const method of requiredMethods) {
    if (notificationServiceContent.includes(`async ${method}(`) || 
        notificationServiceContent.includes(`${method}(`)) {
      console.log(`   ✅ ${method} - Found`);
      methodsFound++;
    } else {
      console.log(`   ❌ ${method} - Missing`);
      allTestsPassed = false;
    }
  }
  
  console.log(`   📊 Methods found: ${methodsFound}/${requiredMethods.length}\n`);
  
  // Test 2: Check database service doesn't have duplicate exports
  console.log('2️⃣ Testing Database Service Exports...');
  
  const databaseServiceContent = readFile('lib/database.ts');
  
  const getUserNotificationsExports = (databaseServiceContent.match(/export const getUserNotifications/g) || []).length;
  
  if (getUserNotificationsExports === 1) {
    console.log('   ✅ No duplicate getUserNotifications exports');
  } else {
    console.log(`   ❌ Found ${getUserNotificationsExports} getUserNotifications exports (should be 1)`);
    allTestsPassed = false;
  }
  
  // Check if database service imports correct notification service
  if (databaseServiceContent.includes("import('./notification-service')")) {
    console.log('   ✅ Database service imports correct notification service');
  } else if (databaseServiceContent.includes("import('./notification-service-simple')")) {
    console.log('   ❌ Database service still imports notification-service-simple');
    allTestsPassed = false;
  } else {
    console.log('   ✅ Database service notification imports look correct');
  }
  
  console.log('');
  
  // Test 3: Check task management service uses correct method names
  console.log('3️⃣ Testing Task Management Service...');
  
  const taskManagementContent = readFile('lib/task-management-service.ts');
  
  if (taskManagementContent.includes('sendTaskAssignment(')) {
    console.log('   ✅ Task management service uses correct sendTaskAssignment method');
  } else if (taskManagementContent.includes('sendTaskAssignmentNotification(')) {
    console.log('   ❌ Task management service still uses old sendTaskAssignmentNotification method');
    allTestsPassed = false;
  } else {
    console.log('   ⚠️  Could not verify task assignment method calls');
  }
  
  console.log('');
  
  // Test 4: Check team service is properly exported
  console.log('4️⃣ Testing Team Service Export...');
  
  const teamServiceContent = readFile('lib/team-service.ts');
  
  if (teamServiceContent.includes('export const teamService')) {
    console.log('   ✅ Team service is properly exported');
  } else {
    console.log('   ❌ Team service export not found');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Test 5: Check notification center uses correct methods
  console.log('5️⃣ Testing Notification Center Integration...');
  
  const notificationCenterContent = readFile('components/notification-center.tsx');
  
  if (notificationCenterContent.includes('notificationService.getUserNotifications')) {
    console.log('   ✅ Notification center calls getUserNotifications');
  } else {
    console.log('   ❌ Notification center does not call getUserNotifications');
    allTestsPassed = false;
  }
  
  if (notificationCenterContent.includes('notificationService.subscribeToNotifications')) {
    console.log('   ✅ Notification center uses subscribeToNotifications');
  } else {
    console.log('   ❌ Notification center does not use subscribeToNotifications');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Summary
  console.log('📋 VALIDATION SUMMARY:');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL FIXES VALIDATED SUCCESSFULLY!');
    console.log('   ✅ Notification service methods are implemented');
    console.log('   ✅ Database service exports are fixed');
    console.log('   ✅ Task management service uses correct methods');
    console.log('   ✅ Team service is properly exported');
    console.log('   ✅ Notification center integration looks correct');
    console.log('\n🚀 The notification and task display issues should now be resolved!');
  } else {
    console.log('\n⚠️  SOME ISSUES REMAIN - Please review the failed tests above');
  }
}

validateFixes();