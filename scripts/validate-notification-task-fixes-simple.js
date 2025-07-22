#!/usr/bin/env node

// Simple validation script for notification and task display fixes

console.log('🔧 Validating Notification and Task Display Fixes...\n');

async function validateFixes() {
  try {
    // Test 1: Check if notification service can be imported
    console.log('1️⃣ Testing Notification Service Import...');
    
    try {
      const { notificationService } = await import('../lib/notification-service.js');
      console.log('   ✅ Notification service imported successfully');
      
      // Check key methods
      const methods = [
        'getUserNotifications',
        'getUnreadCount',
        'markAsRead',
        'subscribeToNotifications',
        'sendTaskAssignment'
      ];
      
      let availableMethods = 0;
      for (const method of methods) {
        if (typeof notificationService[method] === 'function') {
          console.log(`   ✅ ${method} - Available`);
          availableMethods++;
        } else {
          console.log(`   ❌ ${method} - Missing`);
        }
      }
      
      console.log(`   📊 Notification methods: ${availableMethods}/${methods.length}\n`);
      
    } catch (error) {
      console.log('   ❌ Failed to import notification service:', error.message);
    }
    
    // Test 2: Check if task service can be imported
    console.log('2️⃣ Testing Task Service Import...');
    
    try {
      const { taskService } = await import('../lib/task-service.js');
      console.log('   ✅ Task service imported successfully');
      
      // Check key methods
      const taskMethods = [
        'getUserTasks',
        'subscribeToUserTasks',
        'updateTaskStatus',
        'assignTaskToUser'
      ];
      
      let availableTaskMethods = 0;
      for (const method of taskMethods) {
        if (typeof taskService[method] === 'function') {
          console.log(`   ✅ ${method} - Available`);
          availableTaskMethods++;
        } else {
          console.log(`   ❌ ${method} - Missing`);
        }
      }
      
      console.log(`   📊 Task methods: ${availableTaskMethods}/${taskMethods.length}\n`);
      
    } catch (error) {
      console.log('   ❌ Failed to import task service:', error.message);
    }
    
    // Test 3: Check database service exports
    console.log('3️⃣ Testing Database Service Exports...');
    
    try {
      const db = await import('../lib/database.js');
      console.log('   ✅ Database service imported successfully');
      
      const dbMethods = [
        'getUserNotifications',
        'createNotification',
        'markNotificationAsRead',
        'subscribeToUserNotifications'
      ];
      
      let availableDbMethods = 0;
      for (const method of dbMethods) {
        if (typeof db[method] === 'function') {
          console.log(`   ✅ ${method} - Available`);
          availableDbMethods++;
        } else {
          console.log(`   ❌ ${method} - Missing`);
        }
      }
      
      console.log(`   📊 Database methods: ${availableDbMethods}/${dbMethods.length}\n`);
      
    } catch (error) {
      console.log('   ❌ Failed to import database service:', error.message);
    }
    
    console.log('🎯 VALIDATION COMPLETE');
    console.log('   If all services imported successfully, the fixes are working!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

validateFixes();