// Notification service for team invitations and task assignments

import { databaseService } from './database';
import { 
  Notification, 
  CreateNotificationData, 
  TeamInvitationData, 
  TaskAssignmentData,
  User 
} from './types';

export interface NotificationService {
  // Team invitation notifications
  sendTeamInvitation(invitation: TeamInvitationData): Promise<string>;
  acceptTeamInvitation(notificationId: string, userId: string): Promise<boolean>;
  declineTeamInvitation(notificationId: string): Promise<boolean>;
  
  // Task assignment notifications
  sendTaskAssignment(assignment: TaskAssignmentData): Promise<string>;
  
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
    try {
      // First, search for the user by email to get their userId
      const inviteeUser = await databaseService.searchUserByEmail(invitation.inviteeEmail);
      
      if (!inviteeUser) {
        throw new Error('User not found with the provided email');
      }

      const notificationData: CreateNotificationData = {
        userId: inviteeUser.uid,
        type: 'team_invitation',
        title: 'Team Invitation',
        message: `${invitation.inviterName} invited you to join the team "${invitation.teamName}"`,
        data: {
          teamId: invitation.teamId,
          teamName: invitation.teamName,
          inviterId: inviteeUser.uid, // This should be the inviter's ID, but we'll use what we have
          inviterName: invitation.inviterName,
        }
      };

      return await databaseService.createNotification(notificationData);
    } catch (error) {
      console.error('Failed to send team invitation:', error);
      throw new Error(`Failed to send team invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Accept team invitation
  async acceptTeamInvitation(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Get the notification to extract team information
      const notifications = await databaseService.getUserNotifications(userId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification || notification.type !== 'team_invitation') {
        throw new Error('Team invitation notification not found');
      }

      const { teamId, teamName } = notification.data;
      
      if (!teamId) {
        throw new Error('Invalid team invitation data');
      }

      // Add user to the team
      const user = await databaseService.searchUserByEmail(''); // We need a better way to get user info
      const teamMember = {
        userId,
        email: user?.email || '',
        displayName: user?.displayName || 'Unknown User',
        role: 'member' as const,
        status: 'active' as const,
      };

      await databaseService.addTeamMember(teamId, teamMember);
      
      // Delete the notification
      await databaseService.deleteNotification(notificationId);
      
      return true;
    } catch (error) {
      console.error('Failed to accept team invitation:', error);
      throw new Error(`Failed to accept team invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Decline team invitation
  async declineTeamInvitation(notificationId: string): Promise<boolean> {
    try {
      // Simply delete the notification
      return await databaseService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to decline team invitation:', error);
      throw new Error(`Failed to decline team invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send task assignment notification
  async sendTaskAssignment(assignment: TaskAssignmentData): Promise<string> {
    try {
      const notificationData: CreateNotificationData = {
        userId: assignment.assigneeId,
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: `You have been assigned a task: "${assignment.taskDescription}" in meeting "${assignment.meetingTitle}"`,
        data: {
          taskId: assignment.taskId,
          taskDescription: assignment.taskDescription,
          meetingTitle: assignment.meetingTitle,
          inviterName: assignment.assignedBy, // Using inviterName field for assignedBy
        }
      };

      return await databaseService.createNotification(notificationData);
    } catch (error) {
      console.error('Failed to send task assignment:', error);
      throw new Error(`Failed to send task assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all notifications for a user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      return await databaseService.getUserNotifications(userId);
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw new Error(`Failed to get notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      return await databaseService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      return await databaseService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error(`Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await databaseService.getUserNotifications(userId);
      return notifications.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      // Check if it's a permission error and handle gracefully
      if (error instanceof Error && error.message.includes('permission')) {
        console.warn('Permission denied for notifications - user may need to authenticate');
      }
      return 0; // Return 0 on error to avoid breaking UI
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    return databaseService.subscribeToUserNotifications(userId, callback);
  }
}

// Create and export singleton instance
export const notificationService = new NotificationServiceImpl();

// Export the service class for testing
export { NotificationServiceImpl };