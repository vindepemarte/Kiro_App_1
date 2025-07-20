// Integration tests for notification system functionality
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationServiceImpl } from '../notification-service';
import { DatabaseService } from '../database';
import { 
  Notification, 
  CreateNotificationData, 
  TeamInvitationData, 
  TaskAssignmentData, 
  MeetingAssignmentData,
  User,
  Team
} from '../types';

// Mock database service
const mockDatabaseService: jest.Mocked<DatabaseService> = {
  // Notification operations
  createNotification: vi.fn(),
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscribeToUserNotifications: vi.fn(),
  
  // User operations
  searchUserByEmail: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  subscribeToUserProfile: vi.fn(),
  
  // Team operations
  createTeam: vi.fn(),
  getUserTeams: vi.fn(),
  getTeamById: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  subscribeToTeam: vi.fn(),
  subscribeToUserTeams: vi.fn(),
  
  // Team member operations
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  getTeamMembers: vi.fn(),
  
  // Meeting operations
  saveMeeting: vi.fn(),
  getUserMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  subscribeToUserMeetings: vi.fn(),
  getTeamMeetings: vi.fn(),
  subscribeToTeamMeetings: vi.fn(),
  
  // Task operations
  assignTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTeamTasks: vi.fn(),
  
  // Offline support
  enableOfflineSupport: vi.fn(),
  disableOfflineSupport: vi.fn(),
};

// Mock team service functions
const mockTeamService = {
  getTeam: vi.fn(),
  acceptTeamInvitation: vi.fn(),
  declineTeamInvitation: vi.fn(),
};

// Mock the team service import
vi.mock('../team-service', () => ({
  getTeamService: () => mockTeamService,
}));

describe('Notification System Integration Tests', () => {
  let notificationService: NotificationServiceImpl;

  // Test data
  const mockUser1: User = {
    uid: 'user1',
    email: 'user1@example.com',
    displayName: 'User One',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T00:00:00.000Z'
    },
    providerData: [],
    refreshToken: '',
    tenantId: null
  };

  const mockUser2: User = {
    uid: 'user2',
    email: 'user2@example.com',
    displayName: 'User Two',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T00:00:00.000Z'
    },
    providerData: [],
    refreshToken: '',
    tenantId: null
  };

  const mockTeam: Team = {
    id: 'team1',
    name: 'Test Team',
    description: 'A test team',
    createdBy: 'user1',
    members: [
      {
        userId: 'user1',
        email: 'user1@example.com',
        displayName: 'User One',
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      },
      {
        userId: 'user2',
        email: 'user2@example.com',
        displayName: 'User Two',
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockNotifications: Notification[] = [
    {
      id: 'notification1',
      userId: 'user2',
      type: 'team_invitation',
      title: 'Team Invitation',
      message: 'You have been invited to join Test Team',
      data: {
        teamId: 'team1',
        teamName: 'Test Team',
        inviterId: 'user1',
        inviterName: 'User One'
      },
      read: false,
      createdAt: new Date()
    },
    {
      id: 'notification2',
      userId: 'user2',
      type: 'task_assignment',
      title: 'New Task Assignment',
      message: 'You have been assigned a task',
      data: {
        taskId: 'task1',
        taskDescription: 'Complete feature implementation',
        meetingTitle: 'Sprint Planning'
      },
      read: false,
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    notificationService = new NotificationServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Team Invitation Notifications', () => {
    it('should send team invitation notification successfully', async () => {
      // Arrange
      const invitationData: TeamInvitationData = {
        inviteeEmail: 'user2@example.com',
        inviteeDisplayName: 'User Two',
        teamId: 'team1',
        teamName: 'Test Team',
        inviterName: 'User One'
      };

      mockDatabaseService.searchUserByEmail.mockResolvedValue(mockUser2);
      mockDatabaseService.createNotification.mockResolvedValue('notification1');

      // Act
      const notificationId = await notificationService.sendTeamInvitation(invitationData);

      // Assert
      expect(notificationId).toBe('notification1');
      expect(mockDatabaseService.searchUserByEmail).toHaveBeenCalledWith('user2@example.com');
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'User One invited you to join the team "Test Team"',
        data: {
          teamId: 'team1',
          teamName: 'Test Team',
          inviterId: 'user2',
          inviterName: 'User One',
          inviteeEmail: 'user2@example.com',
          inviteeDisplayName: 'User Two'
        }
      });
    });

    it('should handle user not found for invitation', async () => {
      // Arrange
      const invitationData: TeamInvitationData = {
        inviteeEmail: 'nonexistent@example.com',
        inviteeDisplayName: 'Nonexistent User',
        teamId: 'team1',
        teamName: 'Test Team',
        inviterName: 'User One'
      };

      mockDatabaseService.searchUserByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(notificationService.sendTeamInvitation(invitationData))
        .rejects.toThrow('User not found with the provided email');
    });

    it('should accept team invitation successfully', async () => {
      // Arrange
      mockDatabaseService.getUserNotifications.mockResolvedValue(mockNotifications);
      mockTeamService.acceptTeamInvitation.mockResolvedValue(undefined);

      // Act
      const result = await notificationService.acceptTeamInvitation('notification1', 'user2');

      // Assert
      expect(result).toBe(true);
      expect(mockTeamService.acceptTeamInvitation).toHaveBeenCalledWith('notification1', 'user2');
    });

    it('should decline team invitation successfully', async () => {
      // Arrange
      mockTeamService.declineTeamInvitation.mockResolvedValue(undefined);

      // Act
      const result = await notificationService.declineTeamInvitation('notification1', 'user2');

      // Assert
      expect(result).toBe(true);
      expect(mockTeamService.declineTeamInvitation).toHaveBeenCalledWith('notification1', 'user2');
    });

    it('should handle invalid notification for invitation acceptance', async () => {
      // Arrange
      mockDatabaseService.getUserNotifications.mockResolvedValue([]);

      // Act & Assert
      await expect(notificationService.acceptTeamInvitation('nonexistent', 'user2'))
        .rejects.toThrow('Notification not found');
    });

    it('should validate invitation notification type', async () => {
      // Arrange
      const nonInvitationNotifications = [
        {
          ...mockNotifications[1], // task_assignment notification
          id: 'notification1'
        }
      ];

      mockDatabaseService.getUserNotifications.mockResolvedValue(nonInvitationNotifications);

      // Act & Assert
      await expect(notificationService.acceptTeamInvitation('notification1', 'user2'))
        .rejects.toThrow('This is not a team invitation');
    });
  });

  describe('Task Assignment Notifications', () => {
    it('should send task assignment notification successfully', async () => {
      // Arrange
      const taskAssignment: TaskAssignmentData = {
        assigneeId: 'user2',
        taskId: 'task1',
        taskDescription: 'Complete feature implementation',
        meetingTitle: 'Sprint Planning',
        assignedBy: 'User One'
      };

      mockDatabaseService.createNotification.mockResolvedValue('notification2');

      // Act
      const notificationId = await notificationService.sendTaskAssignment(taskAssignment);

      // Assert
      expect(notificationId).toBe('notification2');
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: 'You have been assigned a task: "Complete feature implementation" in meeting "Sprint Planning"',
        data: {
          taskId: 'task1',
          taskDescription: 'Complete feature implementation',
          meetingTitle: 'Sprint Planning',
          inviterName: 'User One'
        }
      });
    });

    it('should validate task assignment data', async () => {
      // Arrange
      const invalidTaskAssignment: TaskAssignmentData = {
        assigneeId: '',
        taskId: 'task1',
        taskDescription: 'Complete feature implementation',
        meetingTitle: 'Sprint Planning',
        assignedBy: 'User One'
      };

      // Act & Assert
      await expect(notificationService.sendTaskAssignment(invalidTaskAssignment))
        .rejects.toThrow('Assignee ID is required');
    });
  });

  describe('Meeting Assignment Notifications', () => {
    it('should send meeting assignment notifications to team members', async () => {
      // Arrange
      const meetingAssignment: MeetingAssignmentData = {
        meetingId: 'meeting1',
        meetingTitle: 'Sprint Planning',
        teamId: 'team1',
        teamName: 'Test Team',
        assignedBy: 'user1',
        assignedByName: 'User One'
      };

      mockTeamService.getTeam.mockResolvedValue(mockTeam);
      mockDatabaseService.createNotification
        .mockResolvedValueOnce('notification1')
        .mockResolvedValueOnce('notification2');

      // Act
      const notificationIds = await notificationService.sendMeetingAssignment(meetingAssignment);

      // Assert
      expect(notificationIds).toHaveLength(1); // Only user2 should get notification (not the assigner)
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'meeting_assignment',
        title: 'New Team Meeting',
        message: 'User One assigned a new meeting "Sprint Planning" to team "Test Team"',
        data: {
          meetingId: 'meeting1',
          meetingTitle: 'Sprint Planning',
          teamId: 'team1',
          teamName: 'Test Team',
          inviterName: 'User One'
        }
      });
    });

    it('should handle team not found for meeting assignment', async () => {
      // Arrange
      const meetingAssignment: MeetingAssignmentData = {
        meetingId: 'meeting1',
        meetingTitle: 'Sprint Planning',
        teamId: 'nonexistent-team',
        teamName: 'Nonexistent Team',
        assignedBy: 'user1',
        assignedByName: 'User One'
      };

      mockTeamService.getTeam.mockResolvedValue(null);

      // Act & Assert
      await expect(notificationService.sendMeetingAssignment(meetingAssignment))
        .rejects.toThrow('The specified team could not be found');
    });

    it('should send meeting update notifications', async () => {
      // Arrange
      mockTeamService.getTeam.mockResolvedValue(mockTeam);
      mockDatabaseService.createNotification.mockResolvedValue('notification1');

      // Act
      const notificationIds = await notificationService.sendMeetingUpdate(
        'meeting1',
        'Sprint Planning',
        'team1',
        'user1',
        'summary'
      );

      // Assert
      expect(notificationIds).toHaveLength(1);
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'meeting_update',
        title: 'Meeting Summary Updated',
        message: 'User One updated the summary for meeting "Sprint Planning"',
        data: {
          meetingId: 'meeting1',
          meetingTitle: 'Sprint Planning',
          teamId: 'team1',
          teamName: 'Test Team',
          inviterName: 'User One'
        }
      });
    });

    it('should handle different meeting update types', async () => {
      // Arrange
      mockTeamService.getTeam.mockResolvedValue(mockTeam);
      mockDatabaseService.createNotification.mockResolvedValue('notification1');

      // Act & Assert - Action items update
      await notificationService.sendMeetingUpdate('meeting1', 'Sprint Planning', 'team1', 'user1', 'action_items');
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Meeting Action Items Updated',
          message: 'User One updated action items for meeting "Sprint Planning"'
        })
      );

      // Act & Assert - Task assignment update
      await notificationService.sendMeetingUpdate('meeting1', 'Sprint Planning', 'team1', 'user1', 'task_assignment');
      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Meeting Tasks Assigned',
          message: 'User One assigned tasks in meeting "Sprint Planning"'
        })
      );
    });
  });

  describe('General Notification Operations', () => {
    it('should get user notifications successfully', async () => {
      // Arrange
      mockDatabaseService.getUserNotifications.mockResolvedValue(mockNotifications);

      // Act
      const notifications = await notificationService.getUserNotifications('user2');

      // Assert
      expect(notifications).toHaveLength(2);
      expect(notifications[0].type).toBe('team_invitation');
      expect(notifications[1].type).toBe('task_assignment');
    });

    it('should mark notification as read successfully', async () => {
      // Arrange
      mockDatabaseService.markNotificationAsRead.mockResolvedValue(true);

      // Act
      const result = await notificationService.markAsRead('notification1');

      // Assert
      expect(result).toBe(true);
      expect(mockDatabaseService.markNotificationAsRead).toHaveBeenCalledWith('notification1');
    });

    it('should delete notification successfully', async () => {
      // Arrange
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      // Act
      const result = await notificationService.deleteNotification('notification1');

      // Assert
      expect(result).toBe(true);
      expect(mockDatabaseService.deleteNotification).toHaveBeenCalledWith('notification1');
    });

    it('should get unread notification count', async () => {
      // Arrange
      const notificationsWithMixedReadStatus = [
        { ...mockNotifications[0], read: false },
        { ...mockNotifications[1], read: true },
        { ...mockNotifications[0], id: 'notification3', read: false }
      ];

      mockDatabaseService.getUserNotifications.mockResolvedValue(notificationsWithMixedReadStatus);

      // Act
      const unreadCount = await notificationService.getUnreadCount('user2');

      // Assert
      expect(unreadCount).toBe(2);
    });

    it('should handle authentication errors gracefully for unread count', async () => {
      // Arrange
      const authError = new Error('Authentication required');
      authError.name = 'AUTH_ERROR';
      mockDatabaseService.getUserNotifications.mockRejectedValue(authError);

      // Act
      const unreadCount = await notificationService.getUnreadCount('user2');

      // Assert
      expect(unreadCount).toBe(0); // Should return 0 instead of throwing
    });

    it('should validate user ID for notifications', async () => {
      // Act & Assert
      await expect(notificationService.getUserNotifications(''))
        .rejects.toThrow('User ID is required');

      await expect(notificationService.markAsRead(''))
        .rejects.toThrow('Notification ID is required');

      await expect(notificationService.deleteNotification(''))
        .rejects.toThrow('Notification ID is required');
    });
  });

  describe('Real-time Notification Subscriptions', () => {
    it('should set up notification subscription successfully', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      const mockCallback = vi.fn();
      mockDatabaseService.subscribeToUserNotifications.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = notificationService.subscribeToNotifications('user1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToUserNotifications).toHaveBeenCalledWith('user1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle real-time notification updates', () => {
      // Arrange
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        // Simulate real-time update
        setTimeout(() => callback(mockNotifications), 0);
        return mockUnsubscribe;
      });

      // Act
      const unsubscribe = notificationService.subscribeToNotifications('user2', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToUserNotifications).toHaveBeenCalledWith('user2', mockCallback);
      
      // Verify callback will be called with notifications
      setTimeout(() => {
        expect(mockCallback).toHaveBeenCalledWith(mockNotifications);
      }, 10);
    });

    it('should cleanup subscription properly', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      const mockCallback = vi.fn();
      mockDatabaseService.subscribeToUserNotifications.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = notificationService.subscribeToNotifications('user1', mockCallback);
      unsubscribe();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabaseService.getUserNotifications.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(notificationService.getUserNotifications('user1'))
        .rejects.toThrow();
    });

    it('should retry failed operations', async () => {
      // Arrange
      mockDatabaseService.createNotification
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('notification1');

      const taskAssignment: TaskAssignmentData = {
        assigneeId: 'user2',
        taskId: 'task1',
        taskDescription: 'Complete feature implementation',
        meetingTitle: 'Sprint Planning',
        assignedBy: 'User One'
      };

      // Act
      const notificationId = await notificationService.sendTaskAssignment(taskAssignment);

      // Assert
      expect(notificationId).toBe('notification1');
      expect(mockDatabaseService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch operations', async () => {
      // Arrange
      const teamWithMultipleMembers: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'user3',
            email: 'user3@example.com',
            displayName: 'User Three',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ]
      };

      mockTeamService.getTeam.mockResolvedValue(teamWithMultipleMembers);
      mockDatabaseService.createNotification
        .mockResolvedValueOnce('notification1')
        .mockRejectedValueOnce(new Error('Failed to create notification'));

      const meetingAssignment: MeetingAssignmentData = {
        meetingId: 'meeting1',
        meetingTitle: 'Sprint Planning',
        teamId: 'team1',
        teamName: 'Test Team',
        assignedBy: 'user1',
        assignedByName: 'User One'
      };

      // Act
      const notificationIds = await notificationService.sendMeetingAssignment(meetingAssignment);

      // Assert
      expect(notificationIds).toHaveLength(1); // Only successful notifications returned
      expect(mockDatabaseService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should validate notification data integrity', async () => {
      // Arrange
      const invalidInvitation: TeamInvitationData = {
        inviteeEmail: '',
        inviteeDisplayName: 'User Two',
        teamId: 'team1',
        teamName: 'Test Team',
        inviterName: 'User One'
      };

      // Act & Assert
      await expect(notificationService.sendTeamInvitation(invalidInvitation))
        .rejects.toThrow('Invitee email is required');
    });

    it('should handle missing notification data gracefully', async () => {
      // Arrange
      const notificationWithMissingData = [
        {
          ...mockNotifications[0],
          data: {} // Missing team data
        }
      ];

      mockDatabaseService.getUserNotifications.mockResolvedValue(notificationWithMissingData);

      // Act & Assert
      await expect(notificationService.acceptTeamInvitation('notification1', 'user2'))
        .rejects.toThrow('Missing team information in invitation');
    });
  });

  describe('Notification Badge and UI Integration', () => {
    it('should update notification badge count in real-time', () => {
      // Arrange
      let callbackFunction: ((notifications: Notification[]) => void) | null = null;
      const mockUnsubscribe = vi.fn();
      
      mockDatabaseService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        callbackFunction = callback;
        return mockUnsubscribe;
      });

      const mockCallback = vi.fn();

      // Act
      notificationService.subscribeToNotifications('user2', mockCallback);

      // Simulate new notification
      const updatedNotifications = [
        ...mockNotifications,
        {
          id: 'notification3',
          userId: 'user2',
          type: 'meeting_assignment' as const,
          title: 'New Meeting Assignment',
          message: 'New meeting assigned to your team',
          data: { meetingId: 'meeting2' },
          read: false,
          createdAt: new Date()
        }
      ];

      if (callbackFunction) {
        callbackFunction(updatedNotifications);
      }

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(updatedNotifications);
    });

    it('should handle notification actions correctly', async () => {
      // Arrange
      const actionableNotification: Notification = {
        id: 'notification1',
        userId: 'user2',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Test Team',
        data: {
          teamId: 'team1',
          teamName: 'Test Team',
          inviterId: 'user1',
          inviterName: 'User One'
        },
        read: false,
        createdAt: new Date()
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue([actionableNotification]);
      mockTeamService.acceptTeamInvitation.mockResolvedValue(undefined);

      // Act - Accept invitation
      const acceptResult = await notificationService.acceptTeamInvitation('notification1', 'user2');

      // Assert
      expect(acceptResult).toBe(true);
      expect(mockTeamService.acceptTeamInvitation).toHaveBeenCalledWith('notification1', 'user2');
    });
  });
});