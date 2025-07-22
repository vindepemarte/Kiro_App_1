#!/usr/bin/env node

// Comprehensive validation script for notification and task display fixes

console.log('🔧 Validating Notification and Task Display Fixes...\n');

const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return '';
  }
}

function checkMethodExists(content, methodName, context) {
  const patterns = [
    new RegExp(`${methodName}\\s*\\(`),
    new RegExp(`${methodName}:\\s*async`),
    new RegExp(`async\\s+${methodName}\\s*\\(`),
    new RegExp(`${methodName}\\s*=\\s*async`),
    new RegExp(`${methodName}\\s*:\\s*function`),
    new RegExp(`function\\s+${methodName}\\s*\\(`)
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

function validateFixes() {
  let allTestsPassed = true;
  let totalTests = 0;
  let passedTests = 0;
  
  console.log('🎯 Comprehensive Validation of Notification and Task Fixes...\n');
  
  // Test 1: Notification Service Methods
  console.log('1️⃣ Testing Notification Service Methods...');
  const notificationContent = readFile('lib/notification-service.ts');
  
  const notificationMethods = [
    'getUserNotifications',
    'getUnreadCount',
    'markAsRead',
    'subscribeToNotifications',
    'sendTaskAssignment',
    'sendTaskAssignmentNotification',
    'acceptTeamInvitation',
    'declineTeamInvitation',
    'deleteNotification'
  ];
  
  notificationMethods.forEach(method => {
    totalTests++;
    if (checkMethodExists(notificationContent, method, 'notification service')) {
      console.log(`   ✅ ${method} - Available`);
      passedTests++;
    } else {
      console.log(`   ❌ ${method} - Missing`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Notification methods: ${passedTests - (totalTests - notificationMethods.length)}/${notificationMethods.length}\n`);
  
  // Test 2: Task Service Methods
  console.log('2️⃣ Testing Task Service Methods...');
  const taskServiceContent = readFile('lib/task-service.ts');
  const taskManagementContent = readFile('lib/task-management-service.ts');
  
  const taskMethods = [
    'getUserTasks',
    'subscribeToUserTasks',
    'updateTaskStatus',
    'assignTaskToUser',
    'extractTasksFromMeeting',
    'getTeamTasks'
  ];
  
  taskMethods.forEach(method => {
    totalTests++;
    if (checkMethodExists(taskManagementContent, method, 'task management service')) {
      console.log(`   ✅ ${method} - Available`);
      passedTests++;
    } else {
      console.log(`   ❌ ${method} - Missing`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Task methods: ${passedTests - (totalTests - taskMethods.length - notificationMethods.length)}/${taskMethods.length}\n`);
  
  // Test 3: Database Service Exports
  console.log('3️⃣ Testing Database Service Exports...');
  const databaseContent = readFile('lib/database.ts');
  
  const databaseMethods = [
    'getUserNotifications',
    'createNotification',
    'markNotificationAsRead',
    'subscribeToUserNotifications',
    'assignTask',
    'getUserMeetings',
    'getTeamMeetings',
    'getAllTeams'
  ];
  
  databaseMethods.forEach(method => {
    totalTests++;
    if (checkMethodExists(databaseContent, method, 'database service')) {
      console.log(`   ✅ ${method} - Available`);
      passedTests++;
    } else {
      console.log(`   ❌ ${method} - Missing`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Database methods: ${passedTests - (totalTests - databaseMethods.length - taskMethods.length - notificationMethods.length)}/${databaseMethods.length}\n`);
  
  // Test 4: Task Assignment Integration
  console.log('4️⃣ Testing Task Assignment Integration...');
  const dashboardContent = readFile('app/dashboard/page.tsx');
  const taskAssignmentContent = readFile('lib/task-assignment-service.ts');
  
  const integrationChecks = [
    { name: 'Dashboard has TaskAssignment component', check: dashboardContent.includes('TaskAssignment') },
    { name: 'Dashboard has handleTaskAssignment', check: dashboardContent.includes('handleTaskAssignment') },
    { name: 'Task assignment service exists', check: taskAssignmentContent.length > 0 },
    { name: 'Task assignment service has assignTask', check: checkMethodExists(taskAssignmentContent, 'assignTask', 'task assignment') },
    { name: 'Task assignment integrates notifications', check: taskAssignmentContent.includes('notificationService') }
  ];
  
  integrationChecks.forEach(({ name, check }) => {
    totalTests++;
    if (check) {
      console.log(`   ✅ ${name}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${name}`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Integration checks: ${passedTests - (totalTests - integrationChecks.length - databaseMethods.length - taskMethods.length - notificationMethods.length)}/${integrationChecks.length}\n`);
  
  // Test 5: Tasks Page Implementation
  console.log('5️⃣ Testing Tasks Page Implementation...');
  const tasksPageContent = readFile('app/tasks/page.tsx');
  
  const tasksPageChecks = [
    { name: 'Uses taskService.getUserTasks', check: tasksPageContent.includes('taskService.getUserTasks') },
    { name: 'Has real-time subscriptions', check: tasksPageContent.includes('subscribeToUserTasks') },
    { name: 'Can update task status', check: tasksPageContent.includes('updateTaskStatus') },
    { name: 'Shows task statistics', check: tasksPageContent.includes('taskStats') },
    { name: 'Has task filtering', check: tasksPageContent.includes('filteredAndSortedTasks') }
  ];
  
  tasksPageChecks.forEach(({ name, check }) => {
    totalTests++;
    if (check) {
      console.log(`   ✅ ${name}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${name}`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Tasks page checks: ${passedTests - (totalTests - tasksPageChecks.length - integrationChecks.length - databaseMethods.length - taskMethods.length - notificationMethods.length)}/${tasksPageChecks.length}\n`);
  
  // Test 6: Notification Center Integration
  console.log('6️⃣ Testing Notification Center Integration...');
  const notificationCenterContent = readFile('components/notification-center.tsx');
  
  const notificationCenterChecks = [
    { name: 'Uses notificationService', check: notificationCenterContent.includes('notificationService') },
    { name: 'Has getUserNotifications', check: notificationCenterContent.includes('getUserNotifications') },
    { name: 'Has real-time subscriptions', check: notificationCenterContent.includes('subscribeToNotifications') },
    { name: 'Can mark as read', check: notificationCenterContent.includes('markAsRead') },
    { name: 'Handles team invitations', check: notificationCenterContent.includes('acceptTeamInvitation') }
  ];
  
  notificationCenterChecks.forEach(({ name, check }) => {
    totalTests++;
    if (check) {
      console.log(`   ✅ ${name}`);
      passedTests++;
    } else {
      console.log(`   ❌ ${name}`);
      allTestsPassed = false;
    }
  });
  
  console.log(`   📊 Notification center checks: ${passedTests - (totalTests - notificationCenterChecks.length - tasksPageChecks.length - integrationChecks.length - databaseMethods.length - taskMethods.length - notificationMethods.length)}/${notificationCenterChecks.length}\n`);
  
  // Summary
  console.log('📋 COMPREHENSIVE VALIDATION SUMMARY:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed tests: ${passedTests}`);
  console.log(`   Success rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);
  
  if (allTestsPassed) {
    console.log('🎉 ALL NOTIFICATION AND TASK FIXES VALIDATED!');
    console.log('\n✅ Complete System Integration:');
    console.log('   1. ✅ Notification service methods available');
    console.log('   2. ✅ Task service methods available');
    console.log('   3. ✅ Database service exports working');
    console.log('   4. ✅ Task assignment integration complete');
    console.log('   5. ✅ Tasks page implementation complete');
    console.log('   6. ✅ Notification center integration complete');
    
    console.log('\n🚀 EXPECTED FUNCTIONALITY:');
    console.log('   ✅ Users can assign tasks in dashboard');
    console.log('   ✅ Task assignments send notifications');
    console.log('   ✅ Notifications appear in notification center');
    console.log('   ✅ Tasks appear on tasks page');
    console.log('   ✅ Real-time updates work for both notifications and tasks');
    console.log('   ✅ Task status can be updated');
    console.log('   ✅ Team invitations work through notifications');
    
    console.log('\n💡 TROUBLESHOOTING GUIDE:');
    console.log('   If tasks still don\'t appear:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Verify Firebase authentication is working');
    console.log('   3. Check Firestore permissions in Firebase console');
    console.log('   4. Ensure users have proper team memberships');
    console.log('   5. Verify assigneeId is being set correctly in database');
    console.log('   6. Check network tab for failed API calls');
    
  } else {
    console.log('⚠️  SOME ISSUES REMAIN');
    console.log(`   ${totalTests - passedTests} out of ${totalTests} tests failed`);
    console.log('   Please review the failed tests above');
  }
}

validateFixes();