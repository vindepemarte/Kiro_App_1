// Notification service for team invitations and task assignments

import { 
  databaseService,
  getUserNotifications as dbGetUserNotifications,
  createNotification as dbCreateNotification,
  deleteNotification as dbDeleteNotification,
  markNotificationAsRead as dbMarkNotificationAsRead,
  subscribeToUserNotifications as dbSubscribeToUserNotifications,
  searchUserByEmail as dbSearchUserByEmail
} from './database';
import { 
  Notification, 
  CreateNotificationData, 
  TeamInvitationData, 
  TaskAssignmentData,
  MeetingAssignmentData
} from './types';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface NotificationService {
  // Team invitation notifications
  sendTeamInvitation(invitation: TeamInvitationData): Promise<string>;
  acceptTeamInvitation(notificationId: string, userId: string): Promise<boolean>;
  declineTeamInvitation(notificationId: string): Promise<boolean>;
  
  // Task assignment notifications
  sendTaskAssignment(assignment: TaskAssignmentData): Promise<string>;
  
  // Meeting assignment notifications
  sendMeetingAssignment(assignment: MeetingAssignmentData): Promise<string[]>;
  sendMeetingUpdate(meetingId: string, meetingTitle: string, teamId: string, updatedBy: string, updateType: string): Promise<string[]>;
  
  // General notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
  getUnreadCount(userId: string): Promise<number>;
  
  // Real-time subscriptions
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void;
}

class NotificationServiceImpl implements NotificationService {
  
  // Send team invitation notification
  async sendTeamInvitation(invitation: TeamInvitationData): Promise<string> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!invitation?.inviteeEmail?.trim()) {
          throw new AppError('Invitee email is required', 'VALIDATION_ERROR', false, 'Please provide a valid email address');
        }
        if (!invitation?.teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team information');
        }
        if (!invitation?.teamName?.trim()) {
          throw new AppError('Team name is required', 'VALIDATION_ERROR', false, 'Invalid team information');
        }

        // First, search for the user by email to get their userId
        const inviteeUser = await dbSearchUserByEmail(invitation.inviteeEmail);
        
        if (!inviteeUser) {
          throw new AppError(
            'User not found with the provided email', 
            'NOT_FOUND', 
            false, 
            'The user with this email address was not found. Please check the email and try again.'
          );
        }

        const notificationData: CreateNotificationData = {
          userId: inviteeUser.uid,
          type: 'team_invitation',
          title: 'Team Invitation',
          message: `${invitation.inviterName} invited you to join the team "${invitation.teamName}"`,
          data: {
            teamId: invitation.teamId,
            teamName: invitation.teamName,
            inviterId: inviteeUser.uid,
            inviterName: invitation.inviterName,
            inviteeEmail: invitation.inviteeEmail,
            inviteeDisplayName: invitation.inviteeDisplayName,
          }
        };

        return await dbCreateNotification(notificationData);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Team Invitation');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Accept team invitation
  async acceptTeamInvitation(notificationId: string, userId: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!notificationId?.trim()) {
          throw new AppError('Notification ID is required', 'VALIDATION_ERROR', false, 'Invalid notification');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        // Get the notification to extract team information
        const notifications = await dbGetUserNotifications(userId);
        const notification = notifications.find(n => n.id === notificationId);
        
        if (!notification) {
          throw new AppError('Notification not found', 'NOT_FOUND', false, 'This invitation may have already been processed');
        }
        
        if (notification.type !== 'team_invitation') {
          throw new AppError('Invalid notification type', 'VALIDATION_ERROR', false, 'This is not a team invitation');
        }

        const { teamId } = notification.data;
        
        if (!teamId) {
          throw new AppError('Invalid team invitation data', 'VALIDATION_ERROR', false, 'Missing team information in invitation');
        }

        // Use the team service to handle the acceptance logic
        const { getTeamService } = await import('./team-service');
        const teamService = getTeamService(databaseService);
        
        await teamService.acceptTeamInvitation(notificationId, userId);
        
        return true;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Accept Team Invitation');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Decline team invitation
  async declineTeamInvitation(notificationId: string, userId?: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!notificationId?.trim()) {
          throw new AppError('Notification ID is required', 'VALIDATION_ERROR', false, 'Invalid notification');
        }

        // If userId is provided, use the team service for proper cleanup
        if (userId?.trim()) {
          const { getTeamService } = await import('./team-service');
          const teamService = getTeamService(databaseService);
          
          await teamService.declineTeamInvitation(notificationId, userId);
          return true;
        } else {
          // Fallback to just deleting the notification
          return await dbDeleteNotification(notificationId);
        }
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Decline Team Invitation');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Send task assignment notification
  async sendTaskAssignment(assignment: TaskAssignmentData): Promise<string> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!assignment?.assigneeId?.trim()) {
          throw new AppError('Assignee ID is required', 'VALIDATION_ERROR', false, 'Invalid assignee information');
        }
        if (!assignment?.taskId?.trim()) {
          throw new AppError('Task ID is required', 'VALIDATION_ERROR', false, 'Invalid task information');
        }
        if (!assignment?.taskDescription?.trim()) {
          throw new AppError('Task description is required', 'VALIDATION_ERROR', false, 'Task description cannot be empty');
        }

        const notificationData: CreateNotificationData = {
          userId: assignment.assigneeId,
          type: 'task_assignment',
          title: 'New Task Assignment',
          message: `You have been assigned a task: "${assignment.taskDescription}" in meeting "${assignment.meetingTitle}"`,
          data: {
            taskId: assignment.taskId,
            taskDescription: assignment.taskDescription,
            meetingTitle: assignment.meetingTitle,
            inviterName: assignment.assignedBy,
          }
        };

        return await dbCreateNotification(notificationData);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Task Assignment');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Send meeting assignment notification to all team members
  async sendMeetingAssignment(assignment: MeetingAssignmentData): Promise<string[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!assignment?.teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team information');
        }
        if (!assignment?.meetingId?.trim()) {
          throw new AppError('Meeting ID is required', 'VALIDATION_ERROR', false, 'Invalid meeting information');
        }
        if (!assignment?.meetingTitle?.trim()) {
          throw new AppError('Meeting title is required', 'VALIDATION_ERROR', false, 'Meeting title cannot be empty');
        }

        // Get team information to find all team members
        const { getTeamService } = await import('./team-service');
        const teamService = getTeamService(databaseService);
        
        const team = await teamService.getTeam(assignment.teamId);
        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'The specified team could not be found');
        }

        const notificationIds: string[] = [];
        const notificationPromises: Promise<string>[] = [];

        // Send notification to all active team members except the person who assigned it
        for (const member of team.members) {
          if (member.status === 'active' && member.userId !== assignment.assignedBy) {
            const notificationData: CreateNotificationData = {
              userId: member.userId,
              type: 'meeting_assignment',
              title: 'New Team Meeting',
              message: `${assignment.assignedByName} assigned a new meeting "${assignment.meetingTitle}" to team "${assignment.teamName}"`,
              data: {
                meetingId: assignment.meetingId,
                meetingTitle: assignment.meetingTitle,
                teamId: assignment.teamId,
                teamName: assignment.teamName,
                inviterName: assignment.assignedByName,
              }
            };

            notificationPromises.push(dbCreateNotification(notificationData));
          }
        }

        // Wait for all notifications to be created
        const results = await Promise.allSettled(notificationPromises);
        
        // Collect successful notification IDs and log failures
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            notificationIds.push(result.value);
          } else {
            console.error(`Failed to send meeting assignment notification to team member ${index}:`, result.reason);
          }
        });

        console.log(`Sent ${notificationIds.length} meeting assignment notifications for meeting "${assignment.meetingTitle}" to team "${assignment.teamName}"`);
        return notificationIds;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Meeting Assignment');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Send meeting update notification to all team members
  async sendMeetingUpdate(
    meetingId: string, 
    meetingTitle: string, 
    teamId: string, 
    updatedBy: string, 
    updateType: string
  ): Promise<string[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!meetingId?.trim()) {
          throw new AppError('Meeting ID is required', 'VALIDATION_ERROR', false, 'Invalid meeting information');
        }
        if (!meetingTitle?.trim()) {
          throw new AppError('Meeting title is required', 'VALIDATION_ERROR', false, 'Meeting title cannot be empty');
        }
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team information');
        }
        if (!updatedBy?.trim()) {
          throw new AppError('Updated by user ID is required', 'VALIDATION_ERROR', false, 'Invalid user information');
        }

        // Get team information to find all team members
        const { getTeamService } = await import('./team-service');
        const teamService = getTeamService(databaseService);
        
        const team = await teamService.getTeam(teamId);
        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'The specified team could not be found');
        }

        // Get the updater's information
        const updaterMember = team.members.find(member => member.userId === updatedBy);
        const updaterName = updaterMember?.displayName || 'Team member';

        const notificationIds: string[] = [];
        const notificationPromises: Promise<string>[] = [];

        // Determine the notification message based on update type
        let notificationTitle = 'Meeting Updated';
        let notificationMessage = `${updaterName} updated the meeting "${meetingTitle}"`;
        
        switch (updateType) {
          case 'summary':
            notificationTitle = 'Meeting Summary Updated';
            notificationMessage = `${updaterName} updated the summary for meeting "${meetingTitle}"`;
            break;
          case 'action_items':
            notificationTitle = 'Meeting Action Items Updated';
            notificationMessage = `${updaterName} updated action items for meeting "${meetingTitle}"`;
            break;
          case 'task_assignment':
            notificationTitle = 'Meeting Tasks Assigned';
            notificationMessage = `${updaterName} assigned tasks in meeting "${meetingTitle}"`;
            break;
          default:
            // Use default message
            break;
        }

        // Send notification to all active team members except the person who made the update
        for (const member of team.members) {
          if (member.status === 'active' && member.userId !== updatedBy) {
            const notificationData: CreateNotificationData = {
              userId: member.userId,
              type: 'meeting_update',
              title: notificationTitle,
              message: notificationMessage,
              data: {
                meetingId: meetingId,
                meetingTitle: meetingTitle,
                teamId: teamId,
                teamName: team.name,
                inviterName: updaterName,
              }
            };

            notificationPromises.push(dbCreateNotification(notificationData));
          }
        }

        // Wait for all notifications to be created
        const results = await Promise.allSettled(notificationPromises);
        
        // Collect successful notification IDs and log failures
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            notificationIds.push(result.value);
          } else {
            console.error(`Failed to send meeting update notification to team member ${index}:`, result.reason);
          }
        });

        console.log(`Sent ${notificationIds.length} meeting update notifications for meeting "${meetingTitle}" (${updateType}) to team "${team.name}"`);
        return notificationIds;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Send Meeting Update');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Get all notifications for a user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        return await dbGetUserNotifications(userId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get User Notifications');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!notificationId?.trim()) {
          throw new AppError('Notification ID is required', 'VALIDATION_ERROR', false, 'Invalid notification');
        }

        return await dbMarkNotificationAsRead(notificationId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Mark Notification as Read');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!notificationId?.trim()) {
          throw new AppError('Notification ID is required', 'VALIDATION_ERROR', false, 'Invalid notification');
        }

        return await dbDeleteNotification(notificationId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Delete Notification');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Validate inputs
      if (!userId?.trim()) {
        console.warn('Invalid user ID for unread count');
        return 0;
      }

      const notifications = await this.getUserNotifications(userId);
      return notifications.filter(notification => !notification.read).length;
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      
      // Handle authentication errors gracefully
      if (appError.code.includes('AUTH') || appError.code.includes('PERMISSION')) {
        console.warn('Authentication required for notifications - user may need to sign in');
        return 0;
      }
      
      // Log other errors but don't break the UI
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    return dbSubscribeToUserNotifications(userId, callback);
  }
}

// Create and export singleton instance
export const notificationService = new NotificationServiceImpl();

// Export the service class for testing
export { NotificationServiceImpl };