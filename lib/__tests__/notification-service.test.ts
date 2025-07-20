// Tests for notification service functionality

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../notification-service';
import { databaseService } from '../database';
import { 
  CreateNotificationData, 
  TeamInvitationData, 
  TaskAssignmentData,
  MeetingAssignmentData,
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

  describe('sendMeetingAssignment', () => {
    it('should create meeting assignment notifications for all team members', async () => {
      const mockTeam = {
        id: 'team123',
        name: 'Test Team',
        description: 'A test team',
        createdBy: 'user1',
        members: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            displayName: 'John Doe',
            role: 'admin' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          },
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'Jane Smith',
            role: 'member' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          },
          {
            userId: 'user3',
            email: 'user3@example.com',
            displayName: 'Bob Wilson',
            role: 'member' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const assignment: MeetingAssignmentData = {
        meetingId: 'meeting123',
        meetingTitle: 'Weekly Team Meeting',
        teamId: 'team123',
        teamName: 'Test Team',
        assignedBy: 'user1',
        assignedByName: 'John Doe',
      };

      // Mock the team service import
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(mockTeam),
        }),
      }));

      vi.mocked(databaseService.createNotification)
        .mockResolvedValueOnce('notification1')
        .mockResolvedValueOnce('notification2');

      const result = await notificationService.sendMeetingAssignment(assignment);

      // Should create notifications for user2 and user3 (not user1 who assigned it)
      expect(databaseService.createNotification).toHaveBeenCalledTimes(2);
      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'meeting_assignment',
        title: 'New Team Meeting',
        message: 'John Doe assigned a new meeting "Weekly Team Meeting" to team "Test Team"',
        data: {
          meetingId: 'meeting123',
          meetingTitle: 'Weekly Team Meeting',
          teamId: 'team123',
          teamName: 'Test Team',
          inviterName: 'John Doe',
        }
      });
      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user3',
        type: 'meeting_assignment',
        title: 'New Team Meeting',
        message: 'John Doe assigned a new meeting "Weekly Team Meeting" to team "Test Team"',
        data: {
          meetingId: 'meeting123',
          meetingTitle: 'Weekly Team Meeting',
          teamId: 'team123',
          teamName: 'Test Team',
          inviterName: 'John Doe',
        }
      });
      expect(result).toEqual(['notification1', 'notification2']);
    });

    it('should handle team not found error', async () => {
      const assignment: MeetingAssignmentData = {
        meetingId: 'meeting123',
        meetingTitle: 'Weekly Team Meeting',
        teamId: 'nonexistent',
        teamName: 'Test Team',
        assignedBy: 'user1',
        assignedByName: 'John Doe',
      };

      // Mock the team service import
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(null),
        }),
      }));

      await expect(notificationService.sendMeetingAssignment(assignment)).rejects.toThrow(
        'Failed to send meeting assignment notifications: Team not found'
      );
    });
  });

  describe('sendMeetingUpdate', () => {
    it('should create meeting update notifications for all team members', async () => {
      const mockTeam = {
        id: 'team123',
        name: 'Test Team',
        description: 'A test team',
        createdBy: 'user1',
        members: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            displayName: 'John Doe',
            role: 'admin' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          },
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'Jane Smith',
            role: 'member' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the team service import
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(mockTeam),
        }),
      }));

      vi.mocked(databaseService.createNotification).mockResolvedValue('notification1');

      const result = await notificationService.sendMeetingUpdate(
        'meeting123',
        'Weekly Team Meeting',
        'team123',
        'user1',
        'summary'
      );

      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'meeting_update',
        title: 'Meeting Summary Updated',
        message: 'John Doe updated the summary for meeting "Weekly Team Meeting"',
        data: {
          meetingId: 'meeting123',
          meetingTitle: 'Weekly Team Meeting',
          teamId: 'team123',
          teamName: 'Test Team',
          inviterName: 'John Doe',
        }
      });
      expect(result).toEqual(['notification1']);
    });

    it('should handle different update types correctly', async () => {
      const mockTeam = {
        id: 'team123',
        name: 'Test Team',
        description: 'A test team',
        createdBy: 'user1',
        members: [
          {
            userId: 'user1',
            email: 'user1@example.com',
            displayName: 'John Doe',
            role: 'admin' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          },
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'Jane Smith',
            role: 'member' as const,
            joinedAt: new Date(),
            status: 'active' as const,
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the team service import
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(mockTeam),
        }),
      }));

      vi.mocked(databaseService.createNotification).mockResolvedValue('notification1');

      // Test action_items update type
      await notificationService.sendMeetingUpdate(
        'meeting123',
        'Weekly Team Meeting',
        'team123',
        'user1',
        'action_items'
      );

      expect(databaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'meeting_update',
        title: 'Meeting Action Items Updated',
        message: 'John Doe updated action items for meeting "Weekly Team Meeting"',
        data: {
          meetingId: 'meeting123',
          meetingTitle: 'Weekly Team Meeting',
          teamId: 'team123',
          teamName: 'Test Team',
          inviterName: 'John Doe',
        }
      });
    });
  });
});