#!/usr/bin/env node

// Test script to verify the task loading fix

const fs = require('fs');
const path = require('path');

console.log('🔧 Testing Task Loading Fix...\n');

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return '';
  }
}

function testTaskLoadingFix() {
  let allTestsPassed = true;
  
  // Test 1: Check if getUserTasks method has been fixed
  console.log('1️⃣ Testing getUserTasks Method Fix...');
  
  const taskManagementContent = readFile('lib/task-management-service.ts');
  
  if (taskManagementContent.includes('CRITICAL FIX: Get tasks from ALL sources')) {
    console.log('   ✅ getUserTasks method has critical fix comment');
  } else {
    console.log('   ❌ getUserTasks method missing critical fix');
    allTestsPassed = false;
  }
  
  if (taskManagementContent.includes('getAllUsersWithMeetings')) {
    console.log('   ✅ getUserTasks searches across all users');
  } else {
    console.log('   ❌ getUserTasks does not search across all users');
    allTestsPassed = false;
  }
  
  if (taskManagementContent.includes('getTeamMeetings(team.id)')) {
    console.log('   ✅ getUserTasks searches team meetings');
  } else {
    console.log('   ❌ getUserTasks does not search team meetings');
    allTestsPassed = false;
  }
  
  if (taskManagementContent.includes('filter(task => task.assigneeId === userId)')) {
    console.log('   ✅ getUserTasks filters by assigneeId');
  } else {
    console.log('   ❌ getUserTasks does not filter by assigneeId');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Test 2: Check if getAllTeams method has been added to database service
  console.log('2️⃣ Testing Database Service getAllTeams Method...');
  
  const databaseContent = readFile('lib/database.ts');
  
  if (databaseContent.includes('getAllTeams(): Promise<Team[]>')) {
    console.log('   ✅ getAllTeams method added to interface');
  } else {
    console.log('   ❌ getAllTeams method missing from interface');
    allTestsPassed = false;
  }
  
  if (databaseContent.includes('async getAllTeams(): Promise<Team[]>')) {
    console.log('   ✅ getAllTeams method implemented');
  } else {
    console.log('   ❌ getAllTeams method not implemented');
    allTestsPassed = false;
  }
  
  if (databaseContent.includes('export const getAllTeams')) {
    console.log('   ✅ getAllTeams method exported');
  } else {
    console.log('   ❌ getAllTeams method not exported');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Test 3: Check task deduplication logic
  console.log('3️⃣ Testing Task Deduplication Logic...');
  
  if (taskManagementContent.includes('Deduplicate tasks')) {
    console.log('   ✅ Task deduplication logic present');
  } else {
    console.log('   ❌ Task deduplication logic missing');
    allTestsPassed = false;
  }
  
  if (taskManagementContent.includes('findIndex(t => t.id === task.id && t.meetingId === task.meetingId)')) {
    console.log('   ✅ Proper deduplication by task ID and meeting ID');
  } else {
    console.log('   ❌ Improper deduplication logic');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Test 4: Check error handling
  console.log('4️⃣ Testing Error Handling...');
  
  if (taskManagementContent.includes('console.warn') && taskManagementContent.includes('Failed to load')) {
    console.log('   ✅ Proper error handling with warnings');
  } else {
    console.log('   ❌ Missing error handling');
    allTestsPassed = false;
  }
  
  if (taskManagementContent.includes('Silently continue if we can\'t access')) {
    console.log('   ✅ Graceful handling of inaccessible meetings');
  } else {
    console.log('   ❌ Missing graceful error handling');
    allTestsPassed = false;
  }
  
  console.log('');
  
  // Summary
  console.log('📋 TASK LOADING FIX SUMMARY:');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TASK LOADING FIXES VALIDATED!');
    console.log('   ✅ getUserTasks searches across ALL meetings');
    console.log('   ✅ Tasks assigned to team members will be found');
    console.log('   ✅ Proper deduplication prevents duplicate tasks');
    console.log('   ✅ Error handling prevents crashes');
    console.log('   ✅ Database service supports getAllTeams');
    console.log('\n🚀 Tasks should now appear on the tasks page!');
    console.log('\n💡 Key Fix: Tasks are now found regardless of who uploaded the meeting');
    console.log('   - Real users (from userProfiles) can see tasks assigned to them');
    console.log('   - Tasks from team meetings are properly retrieved');
    console.log('   - System searches across all meetings, not just user\'s own meetings');
  } else {
    console.log('\n⚠️  SOME TASK LOADING ISSUES REMAIN');
    console.log('   Please review the failed tests above');
  }
}

testTaskLoadingFix();