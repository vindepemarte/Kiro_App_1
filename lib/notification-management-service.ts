// Comprehensive notification management service

import { 
  Notification, 
  CreateNotificationData, 
  Team, 
  TeamMember, 
  User,
  TaskWithContext,
  Meeting
} from './types';
import { DatabaseService } from './database';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface NotificationManagementService {
  // Team invitation notifications
  sendTeamInvitationNotification(
    teamId: string, 
    teamName: string, 
    inviterId: string, 
    inviterName: string, 
    inviteeId: string, 
    inviteeEmail: string, 
    inviteeDisplayName: string
  ): Promise<void>;
  
  // Task assignment notifications
  sendTaskAssignmentNotification(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    assigneeName: string,
    meetingTitle: string,
    assignedBy: string,
    teamId?: string,
    teamName?: string
  ): Promise<void>;
  
  // Meeting sharing notifications
  sendMeetingAssignmentNotification(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    teamName: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<void>;
  
  // Task status change notifications
  sendTaskStatusChangeNotification(
    taskId: string,
    taskDescription: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    teamMembers: TeamMember[]
  ): Promise<void>;
  
  // Overdue task notifications
  sendOverdueTaskNotification(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    daysOverdue: number,
    meetingTitle: string
  ): Promise<void>;
  
  // Batch notification operations
  sendBulkNotifications(notifications: CreateNotificationData[]): Promise<void>;
  
  // Notification management
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  
  // Notification preferences
  shouldSendNotification(userId: string, notificationType: Notification['type']): Promise<boolean>;
}

export class NotificationManagementServiceImpl implements NotificationManagementService {
  constructor(private databaseService: DatabaseService) {}

  // Send team invitation notification
  async sendTeamInvitationNotification(
    teamId: string,
    teamName: string,
    inviterId: string,
    inviterName: string,
    inviteeId: string,
    inviteeEmail: string,
    inviteeDisplayName: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Check if user wants to receive team invitation notifications
        const shouldSend = await this.shouldSendNotification(inviteeId, 'team_invitation');
        if (!shouldSend) {
          console.log(`User ${inviteeId} has disabled team invitation notifications`);
          return;
        }

        const notificationData: CreateNotificationData = {
          userId: inviteeId,
          type: 'team_invitation',
          title: `Team Invitation: ${teamName}`,
          message: `${inviterName} has invited you to join the team "${teamName}". Click to accept or decline this invitation.`,
          data: {
            teamId: teamId,
            teamName: teamName,
            inviterId: inviterId,
            inviterName: inviterName,
            inviteeEmail: inviteeEmail,
            inviteeDisplayName: inviteeDisplayName
          }
        };

        await this.databaseService.createNotification(notificationData);
        console.log(`Team invitation notification sent to ${inviteeDisplayName} (${inviteeEmail})`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Team Invitation Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Send task assignment notification
  async sendTaskAssignmentNotification(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    assigneeName: string,
    meetingTitle: string,
    assignedBy: string,
    teamId?: string,
    teamName?: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Check if user wants to receive task assignment notifications
        const shouldSend = await this.shouldSendNotification(assigneeId, 'task_assignment');
        if (!shouldSend) {
          console.log(`User ${assigneeId} has disabled task assignment notifications`);
          return;
        }

        // Get assigner information
        const assignerProfile = await this.databaseService.getUserProfile(assignedBy);
        const assignerName = assignerProfile?.displayName || 'Team member';

        const teamContext = teamName ? ` from team "${teamName}"` : '';
        const notificationData: CreateNotificationData = {
          userId: assigneeId,
          type: 'task_assignment',
          title: 'New Task Assignment',
          message: `${assignerName} has assigned you a task${teamContext}: "${taskDescription}" from meeting "${meetingTitle}".`,
          data: {
            taskId: taskId,
            taskDescription: taskDescription,
            meetingTitle: meetingTitle,
            teamId: teamId,
            teamName: teamName
          }
        };

        await this.databaseService.createNotification(notificationData);
        console.log(`Task assignment notification sent to ${assigneeName} for task: ${taskDescription}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Task Assignment Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Send meeting assignment notification to all team members
  async sendMeetingAssignmentNotification(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    teamName: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Get team information
        const team = await this.databaseService.getTeamById(teamId);
        if (!team) {
          console.warn(`Team ${teamId} not found for meeting assignment notifications`);
          return;
        }

        // Get active team members (excluding the person who assigned the meeting)
        const activeMembers = team.members.filter(member => 
          member.status === 'active' && member.userId !== assignedBy
        );

        if (activeMembers.length === 0) {
          console.log('No active team members to notify for meeting assignment');
          return;
        }

        // Create notifications for all active team members
        const notifications: CreateNotificationData[] = activeMembers.map(member => ({
          userId: member.userId,
          type: 'meeting_assignment',
          title: `New Team Meeting: ${meetingTitle}`,
          message: `${assignedByName} has shared a meeting "${meetingTitle}" with the team "${teamName}".`,
          data: {
            meetingId: meetingId,
            meetingTitle: meetingTitle,
            teamId: teamId,
            teamName: teamName
          }
        }));

        // Send notifications in batch
        await this.sendBulkNotifications(notifications);
        console.log(`Meeting assignment notifications sent to ${activeMembers.length} team members`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Meeting Assignment Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Send task status change notification
  async sendTaskStatusChangeNotification(
    taskId: string,
    taskDescription: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    teamMembers: TeamMember[]
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Only send notifications for significant status changes
        if (newStatus !== 'completed') {
          return;
        }

        // Get user who changed the status
        const changerProfile = await this.databaseService.getUserProfile(changedBy);
        const changerName = changerProfile?.displayName || 'Team member';

        // Notify team admins about task completion
        const adminMembers = teamMembers.filter(member => 
          member.role === 'admin' && member.status === 'active' && member.userId !== changedBy
        );

        if (adminMembers.length === 0) {
          return;
        }

        const notifications: CreateNotificationData[] = adminMembers.map(admin => ({
          userId: admin.userId,
          type: 'task_completed',
          title: 'Task Completed',
          message: `${changerName} has completed the task: "${taskDescription}".`,
          data: {
            taskId: taskId,
            taskDescription: taskDescription
          }
        }));

        await this.sendBulkNotifications(notifications);
        console.log(`Task completion notifications sent to ${adminMembers.length} team admins`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Task Status Change Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Send overdue task notification
  async sendOverdueTaskNotification(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    daysOverdue: number,
    meetingTitle: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Check if user wants to receive overdue notifications
        const shouldSend = await this.shouldSendNotification(assigneeId, 'task_overdue');
        if (!shouldSend) {
          console.log(`User ${assigneeId} has disabled overdue task notifications`);
          return;
        }

        const notificationData: CreateNotificationData = {
          userId: assigneeId,
          type: 'task_overdue',
          title: 'Overdue Task Reminder',
          message: `Your task "${taskDescription}" from meeting "${meetingTitle}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.`,
          data: {
            taskId: taskId,
            taskDescription: taskDescription,
            meetingTitle: meetingTitle
          }
        };

        await this.databaseService.createNotification(notificationData);
        console.log(`Overdue task notification sent for task: ${taskDescription} (${daysOverdue} days overdue)`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Overdue Task Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Send multiple notifications in batch
  async sendBulkNotifications(notifications: CreateNotificationData[]): Promise<void> {
    return await retryOperation(async () => {
      try {
        if (notifications.length === 0) {
          return;
        }

        // Filter notifications based on user preferences
        const filteredNotifications: CreateNotificationData[] = [];
        for (const notification of notifications) {
          const shouldSend = await this.shouldSendNotification(notification.userId, notification.type);
          if (shouldSend) {
            filteredNotifications.push(notification);
          }
        }

        if (filteredNotifications.length === 0) {
          console.log('No notifications to send after filtering by user preferences');
          return;
        }

        // Send notifications in parallel with limited concurrency
        const batchSize = 10;
        for (let i = 0; i < filteredNotifications.length; i += batchSize) {
          const batch = filteredNotifications.slice(i, i + batchSize);
          const promises = batch.map(notification => 
            this.databaseService.createNotification(notification)
          );
          
          await Promise.all(promises);
        }

        console.log(`Bulk notifications sent: ${filteredNotifications.length} notifications`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Bulk Notifications');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        await this.databaseService.markNotificationAsRead(notificationId);
        console.log(`Notification ${notificationId} marked as read by user ${userId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Mark Notification As Read');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Mark all notifications as read for a user
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Get all unread notifications for the user
        const notifications = await this.databaseService.getUserNotifications(userId);
        const unreadNotifications = notifications.filter(n => !n.read);

        if (unreadNotifications.length === 0) {
          return;
        }

        // Mark all as read in parallel
        const promises = unreadNotifications.map(notification => 
          this.databaseService.markNotificationAsRead(notification.id)
        );

        await Promise.all(promises);
        console.log(`Marked ${unreadNotifications.length} notifications as read for user ${userId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Mark All Notifications As Read');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        await this.databaseService.deleteNotification(notificationId);
        console.log(`Notification ${notificationId} deleted by user ${userId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Delete Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Check if user wants to receive a specific type of notification
  async shouldSendNotification(userId: string, notificationType: Notification['type']): Promise<boolean> {
    try {
      // Get user profile to check notification preferences
      const userProfile = await this.databaseService.getUserProfile(userId);
      
      if (!userProfile || !userProfile.preferences?.notifications) {
        // Default to sending notifications if preferences are not set
        return true;
      }

      const preferences = userProfile.preferences.notifications;

      switch (notificationType) {
        case 'team_invitation':
          return preferences.teamInvitations ?? true;
        case 'task_assignment':
          return preferences.taskAssignments ?? true;
        case 'meeting_assignment':
          return preferences.meetingAssignments ?? true;
        case 'task_completed':
        case 'task_overdue':
        case 'meeting_update':
          return preferences.taskAssignments ?? true; // Use task assignment preference for task-related notifications
        default:
          return true;
      }

    } catch (error) {
      console.error('Error checking notification preferences:', error);
      // Default to sending notifications if we can't check preferences
      return true;
    }
  }
}

// Create and export a singleton instance
let notificationServiceInstance: NotificationManagementServiceImpl | null = null;

export function getNotificationManagementService(databaseService: DatabaseService): NotificationManagementServiceImpl {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationManagementServiceImpl(databaseService);
  }
  return notificationServiceInstance;
}

// Export the implementation class as well
export { NotificationManagementServiceImpl };