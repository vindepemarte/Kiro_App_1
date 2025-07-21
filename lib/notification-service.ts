// Notification service integration - combines database service with notification management

import { databaseService } from './database';
import { getNotificationManagementService, NotificationManagementService } from './notification-management-service';

// Create the notification management service instance
const notificationManagementService = getNotificationManagementService(databaseService);

// Create a wrapper service with the expected interface
export const notificationService = {
  // Existing methods from notification management service
  ...notificationManagementService,
  
  // Add the markAsRead method that the UI expects
  async markAsRead(notificationId: string): Promise<void> {
    // Get the notification first to find the userId
    try {
      // Use the database service to mark as read directly
      await databaseService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  // Add getUserNotifications method that the UI expects
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      return await databaseService.getUserNotifications(userId);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  },
  
  // Add getUnreadCount method that the UI expects
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await databaseService.getUserNotifications(userId);
    return notifications.filter(n => !n.read).length;
  },
  
  // Add subscribeToNotifications method that the UI expects
  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void): () => void {
    try {
      // Use the database service's subscribeToUserNotifications method
      return databaseService.subscribeToUserNotifications(userId, callback);
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      // Return a no-op cleanup function if subscription fails
      return () => {};
    }
  },

  // Add the missing methods that the database service is trying to call
  async sendMeetingAssignment(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    teamName: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<void> {
    return await notificationManagementService.sendMeetingAssignmentNotification(
      meetingId,
      meetingTitle,
      teamId,
      teamName,
      assignedBy,
      assignedByName
    );
  },

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
      if (!notificationManagementService.sendTaskAssignmentNotification) {
        console.error('sendTaskAssignmentNotification method not found on notification management service');
        throw new Error('Notification service method not available');
      }
      
      return await notificationManagementService.sendTaskAssignmentNotification(
        taskId,
        taskDescription,
        assigneeId,
        assigneeName,
        meetingTitle,
        assignedBy,
        teamId,
        teamName
      );
    } catch (error) {
      console.error('Error in sendTaskAssignment:', error);
      throw error;
    }
  },

  async sendMeetingUpdate(
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    updatedBy: string,
    updateType: string
  ): Promise<void> {
    // Get team information
    const team = await databaseService.getTeamById(teamId);
    if (!team) {
      console.warn(`Team ${teamId} not found for meeting update notifications`);
      return;
    }

    // Get updater information
    const updaterProfile = await databaseService.getUserProfile(updatedBy);
    const updaterName = updaterProfile?.displayName || 'Team member';

    // Get active team members (excluding the person who updated the meeting)
    const activeMembers = team.members.filter(member => 
      member.status === 'active' && member.userId !== updatedBy
    );

    if (activeMembers.length === 0) {
      console.log('No active team members to notify for meeting update');
      return;
    }

    // Create notifications for all active team members
    const notifications = activeMembers.map(member => ({
      userId: member.userId,
      type: 'meeting_update' as const,
      title: `Meeting Updated: ${meetingTitle}`,
      message: `${updaterName} has updated the meeting "${meetingTitle}" in team "${team.name}".`,
      data: {
        meetingId: meetingId,
        meetingTitle: meetingTitle,
        teamId: teamId,
        teamName: team.name
      }
    }));

    // Send notifications in batch
    await notificationManagementService.sendBulkNotifications(notifications);
    console.log(`Meeting update notifications sent to ${activeMembers.length} team members`);
  },

  // Add team invitation methods that the notification center expects
  async acceptTeamInvitation(notificationId: string, userId: string): Promise<void> {
    try {
      // Get the notification to extract team invitation data
      const notification = await databaseService.getUserNotifications(userId);
      const teamInvitation = notification.find(n => n.id === notificationId && n.type === 'team_invitation');
      
      if (!teamInvitation) {
        throw new Error('Team invitation notification not found');
      }

      // Import team service dynamically to avoid circular dependencies
      const { teamService } = await import('./team-service');
      
      // Accept the team invitation using the team service
      if (!teamInvitation.data.teamId) {
        throw new Error('Team ID not found in invitation data');
      }
      await teamService.acceptTeamInvitation(teamInvitation.data.teamId, userId);
      
      // Mark the notification as read
      await databaseService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error accepting team invitation:', error);
      throw error;
    }
  },

  async declineTeamInvitation(notificationId: string, userId: string): Promise<void> {
    try {
      // Simply mark the notification as read and delete it
      await databaseService.markNotificationAsRead(notificationId);
      await databaseService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error declining team invitation:', error);
      throw error;
    }
  },

  // Add notification deletion method
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await databaseService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

// Export the interface for type checking
export type { NotificationManagementService } from './notification-management-service';