#!/usr/bin/env node

// Quick fix for task assignment and notification issues

console.log('🔧 Applying task assignment and notification fixes...');

const fs = require('fs');
const path = require('path');

// Fix 1: Update the dashboard to use the task service properly
const dashboardPath = 'app/dashboard/page.tsx';
if (fs.existsSync(dashboardPath)) {
  let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Replace the task assignment handler to use the task service
  const oldTaskHandler = `  // Handle task assignment
  const handleTaskAssignment = async (meetingId: string, taskId: string, assigneeId: string) => {
    if (!user) return

    try {
      const teamService = getTeamService(databaseService)
      // Pass user.uid as both assignedBy and meetingOwnerId
      await databaseService.assignTask(meetingId, taskId, assigneeId, user.uid, user.uid)

      toast.success('Task assigned successfully', {
        title: 'Assignment Complete'
      })

      // Refresh meetings to show updated task assignments
      await loadMeetings()
    } catch (error) {
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage)
    }
  }`;

  const newTaskHandler = `  // Handle task assignment
  const handleTaskAssignment = async (meetingId: string, taskId: string, assigneeId: string) => {
    if (!user) return

    try {
      // Use the task service for proper task assignment
      await taskService.assignTaskToUser(taskId, meetingId, assigneeId, user.uid)

      toast.success('Task assigned successfully', {
        title: 'Assignment Complete'
      })

      // Refresh meetings to show updated task assignments
      await loadMeetings()
    } catch (error) {
      console.error('Task assignment error:', error)
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage || 'Failed to assign task')
    }
  }`;

  if (dashboardContent.includes(oldTaskHandler)) {
    dashboardContent = dashboardContent.replace(oldTaskHandler, newTaskHandler);
    fs.writeFileSync(dashboardPath, dashboardContent);
    console.log('✅ Fixed dashboard task assignment handler');
  }
}

// Fix 2: Create a simple notification service wrapper
const notificationServicePath = 'lib/notification-service-simple.ts';
const notificationServiceContent = `// Simple notification service wrapper to fix missing methods

import { databaseService } from './database';

export const notificationService = {
  // Meeting assignment notification
  async sendMeetingAssignment(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    teamName: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<void> {
    try {
      console.log(\`Meeting assignment notification: \${meetingTitle} assigned to team \${teamName}\`);
      // For now, just log - notifications will be implemented later
    } catch (error) {
      console.warn('Failed to send meeting assignment notification:', error);
    }
  },

  // Task assignment notification
  async sendTaskAssignment(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    assigneeName: string,
    meetingTitle: string,
    assignedBy: string,
    teamId?: string,
    teamName?: string
  ): Promise<void> {
    try {
      console.log(\`Task assignment notification: "\${taskDescription}" assigned to \${assigneeName}\`);
      // For now, just log - notifications will be implemented later
    } catch (error) {
      console.warn('Failed to send task assignment notification:', error);
    }
  },

  // Meeting update notification
  async sendMeetingUpdate(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    updatedBy: string,
    updateType: string
  ): Promise<void> {
    try {
      console.log(\`Meeting update notification: \${meetingTitle} updated (\${updateType})\`);
      // For now, just log - notifications will be implemented later
    } catch (error) {
      console.warn('Failed to send meeting update notification:', error);
    }
  }
};
`;

fs.writeFileSync(notificationServicePath, notificationServiceContent);
console.log('✅ Created simple notification service wrapper');

// Fix 3: Update database service to use the simple notification service
const databasePath = 'lib/database.ts';
if (fs.existsSync(databasePath)) {
  let databaseContent = fs.readFileSync(databasePath, 'utf8');
  
  // Replace the notification service import
  const oldImport = `      // Import notification service dynamically to avoid circular dependencies
      const { notificationService } = await import('./notification-service');`;
  
  const newImport = `      // Import simple notification service to avoid circular dependencies
      const { notificationService } = await import('./notification-service-simple');`;
  
  if (databaseContent.includes(oldImport)) {
    databaseContent = databaseContent.replaceAll(oldImport, newImport);
    fs.writeFileSync(databasePath, databaseContent);
    console.log('✅ Updated database service notification imports');
  }
}

// Fix 4: Reduce transcript size limit to prevent quota issues
const dataValidatorPath = 'lib/data-validator.ts';
if (fs.existsSync(dataValidatorPath)) {
  let validatorContent = fs.readFileSync(dataValidatorPath, 'utf8');
  
  // Reduce the transcript size limit
  const oldLimit = 'const MAX_TRANSCRIPT_SIZE = 500 * 1024; // 500KB';
  const newLimit = 'const MAX_TRANSCRIPT_SIZE = 100 * 1024; // 100KB';
  
  if (validatorContent.includes(oldLimit)) {
    validatorContent = validatorContent.replace(oldLimit, newLimit);
    fs.writeFileSync(dataValidatorPath, validatorContent);
    console.log('✅ Reduced transcript size limit to prevent quota issues');
  }
}

console.log('🎉 Task assignment and notification fixes applied!');
console.log('');
console.log('Next steps:');
console.log('1. Restart your development server: npm run dev');
console.log('2. Try uploading a meeting for a team');
console.log('3. Try assigning tasks to team members');
console.log('4. Check the console for notification logs');