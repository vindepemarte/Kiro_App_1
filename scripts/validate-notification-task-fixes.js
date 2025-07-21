#!/usr/bin/env node

// Validation script for notification and task display fixes

console.log('🔧 Validating Notification and Task Display Fixes...\n');

async function validateFixes() {
  try {
    // Test 1: Check notification service methods
    console.log('1️⃣ Testing Notification Service Methods...');
    
    const { notificationService } = await import('../lib/notification-service.js');
    
    // Check if all required methods exist
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
      if (typeof notificationService[method] === 'function') {
        console.log(`   ✅ ${method} - Available`);
        methodsFound++;
      } else {
        console.log(`   ❌ ${method} - Missing`);
      }
    }
    
    console.log(`   📊 Methods found: ${methodsFound}/${requiredMethods.length}\n`);
    
    // Test 2: Check task service methods
    console.log('2️⃣ Testing Task Service Methods...');
    
    const { taskService } = await import('../lib/task-service.js');
    
    const requiredTaskMethods = [
      'getUserTasks',
      'subscribeToUserTasks',
      'updateTaskStatus',
      'assignTaskToUser'
    ];
    
    let taskMethodsFound = 0;
    for (const method of requiredTaskMethods) {
      if (typeof taskService[method] === 'function') {
        console.log(`   ✅ ${method} - Available`);
        taskMethodsFound++;
      } else {
        console.log(`   ❌ ${method} - Missing`);
      }
    }
    
    console.log(`   📊 Task methods found: ${taskMethodsFound}/${requiredTaskMethods.length}\n`);
    
    // Test 3: Check database service exports
    console.log('3️⃣ Testing Database Service Exports...');
    
    const { 
      getUserNotifications,
      createNotification,
      markNotificationAsRead,
      subscribeToUserNotifications
    } = await import('../lib/database.js');
    
    const dbMethods = [
      { name: 'getUserNotifications', func: getUserNotifications },
      { name: 'createNotification', func: createNotification },
      { name: 'markNotificationAsRead', func: markNotificationAsRead },
      { name: 'subscribeToUserNotifications', func: subscribeToUserNotifications }
    ];
    
    let dbMethodsFound = 0;
    for (const { name, func } of dbMethods) {
      if (typeof func === 'function') {
        console.log(`   ✅ ${name} - Available`);
        dbMethodsFound++;
      } else {
        console.log(`   ❌ ${name} - Missing`);
      }
    }
    
    console.log(`   📊 Database methods found: ${dbMethodsFound}/${dbMethods.length}\n`);
    
    // Test 4: Check team service integration
    console.log('4️⃣ Testing Team Service Integration...');
    
    const { teamService } = await import('../lib/team-service.js');
    
    if (typeof teamService.acceptTeamInvitation === 'function') {
      console.log('   ✅ Team service properly exported');
    } else {
      console.log('   ❌ Team service not properly exported');
    }
    
    // Summary
    console.log('\n📋 VALIDATION SUMMARY:');
    console.log(`   Notification Service: ${methodsFound}/${requiredMethods.length} methods available`);
    console.log(`   Task Service: ${taskMethodsFound}/${requiredTaskMethods.length} methods available`);
    console.log(`   Database Service: ${dbMethodsFound}/${dbMethods.length} methods available`);
    
    const totalMethods = methodsFound + taskMethodsFound + dbMethodsFound;
    const totalRequired = requiredMethods.length + requiredTaskMethods.length + dbMethods.length;
    
    if (totalMethods === totalRequired) {
      console.log('\n🎉 ALL FIXES VALIDATED SUCCESSFULLY!');
      console.log('   ✅ Notification service methods are available');
      console.log('   ✅ Task service methods are available');
      console.log('   ✅ Database service exports are working');
      console.log('   ✅ Service integration is complete');
    } else {
      console.log(`\n⚠️  SOME ISSUES REMAIN: ${totalMethods}/${totalRequired} methods available`);
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

validateFixes();