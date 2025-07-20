// Tests for notification service functionality

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../notification-service';
import { databaseService } from '../database';
import { 
  CreateNotificationData, 
  TeamInvitationData, 
  TaskAssignmentData,
  Notification 
} from '../types';

// Mock the database service
vi.mock('../database', () => ({
  databaseService: {
    createNotification: vi.fn(),
    getUserNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    subscribeToUserNotifications: vi.fn(),
    searchUserByEmail: vi.fn(),
    addTeamMember: vi.fn(),
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTeamInvitation', () => {
    it('should create a team invitation notification', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        isAnonymous: false,
        customClaims: null,
      };

      const invitation: TeamInvitationData = {
        teamId: 'team123',
        teamName: 'Test Team',
        inviterName: 'John Doe',
        inviteeEmail: 'test@example.com',
        inviteeDisplayName: 'Test User',
      };

      vi.mocked(databaseService.searchUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(databaseService.createNotification).mockResolvedValue('notification123');

      const result = await notificationService.sendTeamInvitation(invitation);

      expect(databaseService.searchUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'John Doe invited you to join the team "Test Team"',
        data: {
          teamId: 'team123',
          teamName: 'Test Team',
          inviterId: 'user123',
          inviterName: 'John Doe',
        }
      });
      expect(result).toBe('notification123');
    });

    it('should throw error if user not found', async () => {
      const invitation: TeamInvitationData = {
        teamId: 'team123',
        teamName: 'Test Team',
        inviterName: 'John Doe',
        inviteeEmail: 'nonexistent@example.com',
        inviteeDisplayName: 'Test User',
      };

      vi.mocked(databaseService.searchUserByEmail).mockResolvedValue(null);

      await expect(notificationService.sendTeamInvitation(invitation)).rejects.toThrow(
        'Failed to send team invitation: User not found with the provided email'
      );
    });
  });

  describe('sendTaskAssignment', () => {
    it('should create a task assignment notification', async () => {
      const assignment: TaskAssignmentData = {
        taskId: 'task123',
        taskDescription: 'Complete the report',
        assigneeId: 'user123',
        assigneeName: 'Test User',
        meetingTitle: 'Weekly Standup',
        assignedBy: 'John Doe',
      };

      vi.mocked(databaseService.createNotification).mockResolvedValue('notification123');

      const result = await notificationService.sendTaskAssignment(assignment);

      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: 'You have been assigned a task: "Complete the report" in meeting "Weekly Standup"',
        data: {
          taskId: 'task123',
          taskDescription: 'Complete the report',
          meetingTitle: 'Weekly Standup',
          inviterName: 'John Doe',
        }
      });
      expect(result).toBe('notification123');
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notification1',
          userId: 'user123',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'You have been invited to join a team',
          data: { teamId: 'team123', teamName: 'Test Team' },
          read: false,
          createdAt: new Date(),
        }
      ];

      vi.mocked(databaseService.getUserNotifications).mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications('user123');

      expect(databaseService.getUserNotifications).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(databaseService.markNotificationAsRead).mockResolvedValue(true);

      const result = await notificationService.markAsRead('notification123');

      expect(databaseService.markNotificationAsRead).toHaveBeenCalledWith('notification123');
      expect(result).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const mockNotifications: Notification[] = [
        {
          id: 'notification1',
          userId: 'user123',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'You have been invited to join a team',
          data: {},
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'notification2',
          userId: 'user123',
          type: 'task_assignment',
          title: 'Task Assignment',
          message: 'You have been assigned a task',
          data: {},
          read: true,
          createdAt: new Date(),
        },
        {
          id: 'notification3',
          userId: 'user123',
          type: 'team_invitation',
          title: 'Another Invitation',
          message: 'Another team invitation',
          data: {},
          read: false,
          createdAt: new Date(),
        }
      ];

      vi.mocked(databaseService.getUserNotifications).mockResolvedValue(mockNotifications);

      const result = await notificationService.getUnreadCount('user123');

      expect(result).toBe(2); // Two unread notifications
    });

    it('should return 0 on error', async () => {
      vi.mocked(databaseService.getUserNotifications).mockRejectedValue(new Error('Database error'));

      const result = await notificationService.getUnreadCount('user123');

      expect(result).toBe(0);
    });
  });

  describe('subscribeToNotifications', () => {
    it('should subscribe to real-time notifications', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(databaseService.subscribeToUserNotifications).mockReturnValue(mockUnsubscribe);

      const unsubscribe = notificationService.subscribeToNotifications('user123', mockCallback);

      expect(databaseService.subscribeToUserNotifications).toHaveBeenCalledWith('user123', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('declineTeamInvitation', () => {
    it('should delete the notification', async () => {
      vi.mocked(databaseService.deleteNotification).mockResolvedValue(true);

      const result = await notificationService.declineTeamInvitation('notification123');

      expect(databaseService.deleteNotification).toHaveBeenCalledWith('notification123');
      expect(result).toBe(true);
    });
  });
});