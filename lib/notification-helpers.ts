// Helper functions for sending notifications in various scenarios

import { notificationService } from './notification-service';
import { TeamInvitationData, TaskAssignmentData } from './types';

export class NotificationHelpers {
  
  // Send team invitation notification
  static async sendTeamInvitation(invitation: TeamInvitationData): Promise<string> {
    try {
      return await notificationService.sendTeamInvitation(invitation);
    } catch (error) {
      console.error('Failed to send team invitation notification:', error);
      throw error;
    }
  }

  // Send task assignment notification
  static async sendTaskAssignment(assignment: TaskAssignmentData): Promise<string> {
    try {
      return await notificationService.sendTaskAssignment(assignment);
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
      throw error;
    }
  }

  // Send task completion notification
  static async sendTaskCompletion(
    assignerId: string,
    taskDescription: string,
    completedBy: string,
    meetingTitle: string
  ): Promise<string> {
    try {
      return await notificationService.sendTaskAssignment({
        taskId: `completed-${Date.now()}`,
        taskDescription: `Task completed: ${taskDescription}`,
        assigneeId: assignerId,
        assigneeName: completedBy,
        meetingTitle,
        assignedBy: completedBy,
      });
    } catch (error) {
      console.error('Failed to send task completion notification:', error);
      throw error;
    }
  }

  // Send task overdue notification
  static async sendTaskOverdue(
    assigneeId: string,
    taskDescription: string,
    meetingTitle: string,
    daysOverdue: number
  ): Promise<string> {
    try {
      return await notificationService.sendTaskAssignment({
        taskId: `overdue-${Date.now()}`,
        taskDescription: `Overdue task (${daysOverdue} days): ${taskDescription}`,
        assigneeId,
        assigneeName: 'System',
        meetingTitle,
        assignedBy: 'System',
      });
    } catch (error) {
      console.error('Failed to send task overdue notification:', error);
      throw error;
    }
  }

  // Batch send notifications for multiple team invitations
  static async sendBatchTeamInvitations(invitations: TeamInvitationData[]): Promise<string[]> {
    const results: string[] = [];
    const errors: Error[] = [];

    for (const invitation of invitations) {
      try {
        const notificationId = await this.sendTeamInvitation(invitation);
        results.push(notificationId);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${invitations.length} team invitations failed:`, errors);
    }

    return results;
  }

  // Batch send notifications for multiple task assignments
  static async sendBatchTaskAssignments(assignments: TaskAssignmentData[]): Promise<string[]> {
    const results: string[] = [];
    const errors: Error[] = [];

    for (const assignment of assignments) {
      try {
        const notificationId = await this.sendTaskAssignment(assignment);
        results.push(notificationId);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${assignments.length} task assignments failed:`, errors);
    }

    return results;
  }
}

// Export convenience functions
export const sendTeamInvitation = NotificationHelpers.sendTeamInvitation;
export const sendTaskAssignment = NotificationHelpers.sendTaskAssignment;
export const sendTaskCompletion = NotificationHelpers.sendTaskCompletion;
export const sendTaskOverdue = NotificationHelpers.sendTaskOverdue;