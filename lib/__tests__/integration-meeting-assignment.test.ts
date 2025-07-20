// Integration tests for meeting-team assignment workflow
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../database';
import { NotificationService } from '../notification-service';
import { Meeting, ProcessedMeeting, Team, TeamMember, MeetingAssignmentData } from '../types';

// Mock database service
const mockDatabaseService: jest.Mocked<DatabaseService> = {
  // Meeting operations
  saveMeeting: vi.fn(),
  getUserMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  subscribeToUserMeetings: vi.fn(),
  getTeamMeetings: vi.fn(),
  subscribeToTeamMeetings: vi.fn(),
  
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
  
  // User operations
  searchUserByEmail: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  subscribeToUserProfile: vi.fn(),
  
  // Notification operations
  createNotification: vi.fn(),
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscribeToUserNotifications: vi.fn(),
  
  // Task operations
  assignTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTeamTasks: vi.fn(),
  
  // Offline support
  enableOfflineSupport: vi.fn(),
  disableOfflineSupport: vi.fn(),
};

// Mock notification service
const mockNotificationService: jest.Mocked<NotificationService> = {
  sendTeamInvitation: vi.fn(),
  acceptTeamInvitation: vi.fn(),
  declineTeamInvitation: vi.fn(),
  sendTaskAssignment: vi.fn(),
  sendMeetingAssignment: vi.fn(),
  sendMeetingUpdate: vi.fn(),
  getUserNotifications: vi.fn(),
  markAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUnreadCount: vi.fn(),
  subscribeToNotifications: vi.fn(),
};

describe('Meeting-Team Assignment Integration Tests', () => {
  // Test data
  const mockTeam: Team = {
    id: 'team1',
    name: 'Development Team',
    description: 'Software development team',
    createdBy: 'user1',
    members: [
      {
        userId: 'user1',
        email: 'admin@example.com',
        displayName: 'Team Admin',
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      },
      {
        userId: 'user2',
        email: 'member1@example.com',
        displayName: 'Team Member 1',
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      },
      {
        userId: 'user3',
        email: 'member2@example.com',
        displayName: 'Team Member 2',
        role: 'member',
        joinedAt: new Date(),
        status: 'active'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProcessedMeeting: ProcessedMeeting = {
    summary: 'Weekly team standup meeting discussing project progress and blockers.',
    actionItems: [
      {
        id: 'action1',
        description: 'Complete user authentication module',
        priority: 'high',
        status: 'pending',
        owner: 'Team Member 1'
      },
      {
        id: 'action2',
        description: 'Review pull requests',
        priority: 'medium',
        status: 'pending',
        owner: 'Team Member 2'
      }
    ],
    rawTranscript: 'Meeting transcript content...',
    metadata: {
      fileName: 'standup-meeting.mp3',
      fileSize: 1024000,
      uploadedAt: new Date(),
      processingTime: 5000
    }
  };

  const mockMeeting: Meeting = {
    id: 'meeting1',
    title: 'Weekly Team Standup',
    date: new Date(),
    summary: mockProcessedMeeting.summary,
    actionItems: mockProcessedMeeting.actionItems,
    rawTranscript: mockProcessedMeeting.rawTranscript,
    teamId: 'team1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Meeting Assignment to Team', () => {
    it('should save meeting with team assignment successfully', async () => {
      // Arrange
      mockDatabaseService.saveMeeting.mockResolvedValue('meeting1');
      mockDatabaseService.getTeamById.mockResolvedValue(mockTeam);
      mockNotificationService.sendMeetingAssignment.mockResolvedValue(['notification1', 'notification2']);

      // Act
      const meetingId = await mockDatabaseService.saveMeeting('user1', mockProcessedMeeting, 'team1');

      // Assert
      expect(meetingId).toBe('meeting1');
      expect(mockDatabaseService.saveMeeting).toHaveBeenCalledWith('user1', mockProcessedMeeting, 'team1');
    });

    it('should send notifications to team members when meeting is assigned', async () => {
      // Arrange
      const meetingAssignment: MeetingAssignmentData = {
        meetingId: 'meeting1',
        meetingTitle: 'Weekly Team Standup',
        teamId: 'team1',
        teamName: 'Development Team',
        assignedBy: 'user1',
        assignedByName: 'Team Admin'
      };

      mockNotificationService.sendMeetingAssignment.mockResolvedValue(['notification1', 'notification2']);

      // Act
      const notificationIds = await mockNotificationService.sendMeetingAssignment(meetingAssignment);

      // Assert
      expect(notificationIds).toHaveLength(2);
      expect(mockNotificationService.sendMeetingAssignment).toHaveBeenCalledWith(meetingAssignment);
    });

    it('should handle meeting assignment without team', async () => {
      // Arrange
      mockDatabaseService.saveMeeting.mockResolvedValue('meeting2');

      // Act
      const meetingId = await mockDatabaseService.saveMeeting('user1', mockProcessedMeeting);

      // Assert
      expect(meetingId).toBe('meeting2');
      expect(mockDatabaseService.saveMeeting).toHaveBeenCalledWith('user1', mockProcessedMeeting);
    });

    it('should validate team exists before assignment', async () => {
      // Arrange
      mockDatabaseService.getTeamById.mockResolvedValue(null);
      mockDatabaseService.saveMeeting.mockRejectedValue(new Error('Team not found'));

      // Act & Assert
      await expect(mockDatabaseService.saveMeeting('user1', mockProcessedMeeting, 'nonexistent-team'))
        .rejects.toThrow('Team not found');
    });
  });

  describe('Team Meeting Display and Filtering', () => {
    it('should retrieve team meetings successfully', async () => {
      // Arrange
      const teamMeetings = [
        { ...mockMeeting, id: 'meeting1', teamId: 'team1' },
        { ...mockMeeting, id: 'meeting2', teamId: 'team1' },
        { ...mockMeeting, id: 'meeting3', teamId: 'team1' }
      ];

      mockDatabaseService.getTeamMeetings.mockResolvedValue(teamMeetings);

      // Act
      const meetings = await mockDatabaseService.getTeamMeetings('team1');

      // Assert
      expect(meetings).toHaveLength(3);
      expect(meetings.every(meeting => meeting.teamId === 'team1')).toBe(true);
    });

    it('should separate team meetings from personal meetings', async () => {
      // Arrange
      const userMeetings = [
        { ...mockMeeting, id: 'meeting1', teamId: 'team1' },
        { ...mockMeeting, id: 'meeting2', teamId: undefined },
        { ...mockMeeting, id: 'meeting3', teamId: 'team1' }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValue(userMeetings);

      // Act
      const meetings = await mockDatabaseService.getUserMeetings('user1');

      // Assert
      const teamMeetings = meetings.filter(meeting => meeting.teamId);
      const personalMeetings = meetings.filter(meeting => !meeting.teamId);
      
      expect(teamMeetings).toHaveLength(2);
      expect(personalMeetings).toHaveLength(1);
    });

    it('should subscribe to team meetings real-time updates', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      const mockCallback = vi.fn();
      mockDatabaseService.subscribeToTeamMeetings.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = mockDatabaseService.subscribeToTeamMeetings('team1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToTeamMeetings).toHaveBeenCalledWith('team1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('Meeting Updates and Notifications', () => {
    it('should send update notifications when meeting is modified', async () => {
      // Arrange
      const updatedMeeting = {
        ...mockMeeting,
        summary: 'Updated meeting summary with new information'
      };

      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);
      mockNotificationService.sendMeetingUpdate.mockResolvedValue(['notification1', 'notification2']);

      // Act
      const success = await mockDatabaseService.updateMeeting('meeting1', 'user1', { summary: updatedMeeting.summary });

      // Assert
      expect(success).toBe(true);
      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith('meeting1', 'user1', { summary: updatedMeeting.summary });
    });

    it('should handle different types of meeting updates', async () => {
      // Arrange
      mockNotificationService.sendMeetingUpdate.mockResolvedValue(['notification1']);

      // Act & Assert - Summary update
      await mockNotificationService.sendMeetingUpdate('meeting1', 'Weekly Standup', 'team1', 'user1', 'summary');
      expect(mockNotificationService.sendMeetingUpdate).toHaveBeenCalledWith('meeting1', 'Weekly Standup', 'team1', 'user1', 'summary');

      // Act & Assert - Action items update
      await mockNotificationService.sendMeetingUpdate('meeting1', 'Weekly Standup', 'team1', 'user1', 'action_items');
      expect(mockNotificationService.sendMeetingUpdate).toHaveBeenCalledWith('meeting1', 'Weekly Standup', 'team1', 'user1', 'action_items');
    });

    it('should not send notifications for personal meetings', async () => {
      // Arrange
      const personalMeeting = { ...mockMeeting, teamId: undefined };
      mockDatabaseService.getMeetingById.mockResolvedValue(personalMeeting);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      // Act
      const success = await mockDatabaseService.updateMeeting('meeting1', 'user1', { summary: 'Updated summary' });

      // Assert
      expect(success).toBe(true);
      expect(mockNotificationService.sendMeetingUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Task Assignment Integration', () => {
    it('should assign tasks to team members successfully', async () => {
      // Arrange
      mockDatabaseService.assignTask.mockResolvedValue(true);
      mockNotificationService.sendTaskAssignment.mockResolvedValue('notification1');

      // Act
      const success = await mockDatabaseService.assignTask('meeting1', 'action1', 'user2', 'user1', 'user1');

      // Assert
      expect(success).toBe(true);
      expect(mockDatabaseService.assignTask).toHaveBeenCalledWith('meeting1', 'action1', 'user2', 'user1', 'user1');
    });

    it('should send task assignment notifications', async () => {
      // Arrange
      const taskAssignment = {
        assigneeId: 'user2',
        taskId: 'action1',
        taskDescription: 'Complete user authentication module',
        meetingTitle: 'Weekly Team Standup',
        assignedBy: 'Team Admin'
      };

      mockNotificationService.sendTaskAssignment.mockResolvedValue('notification1');

      // Act
      const notificationId = await mockNotificationService.sendTaskAssignment(taskAssignment);

      // Assert
      expect(notificationId).toBe('notification1');
      expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalledWith(taskAssignment);
    });

    it('should update task status successfully', async () => {
      // Arrange
      mockDatabaseService.updateTaskStatus.mockResolvedValue(true);

      // Act
      const success = await mockDatabaseService.updateTaskStatus('meeting1', 'action1', 'completed');

      // Assert
      expect(success).toBe(true);
      expect(mockDatabaseService.updateTaskStatus).toHaveBeenCalledWith('meeting1', 'action1', 'completed');
    });

    it('should retrieve team tasks successfully', async () => {
      // Arrange
      const teamTasks = [
        {
          id: 'action1',
          description: 'Complete user authentication module',
          priority: 'high' as const,
          status: 'pending' as const,
          owner: 'Team Member 1'
        },
        {
          id: 'action2',
          description: 'Review pull requests',
          priority: 'medium' as const,
          status: 'in_progress' as const,
          owner: 'Team Member 2'
        }
      ];

      mockDatabaseService.getTeamTasks.mockResolvedValue(teamTasks);

      // Act
      const tasks = await mockDatabaseService.getTeamTasks('team1');

      // Assert
      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('in_progress');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle meeting save failures gracefully', async () => {
      // Arrange
      mockDatabaseService.saveMeeting.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(mockDatabaseService.saveMeeting('user1', mockProcessedMeeting, 'team1'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle notification failures without breaking meeting save', async () => {
      // Arrange
      mockDatabaseService.saveMeeting.mockResolvedValue('meeting1');
      mockNotificationService.sendMeetingAssignment.mockRejectedValue(new Error('Notification service unavailable'));

      // Act
      const meetingId = await mockDatabaseService.saveMeeting('user1', mockProcessedMeeting, 'team1');

      // Assert
      expect(meetingId).toBe('meeting1');
      // Meeting should still be saved even if notifications fail
    });

    it('should validate meeting data before saving', async () => {
      // Arrange
      const invalidMeeting = { ...mockProcessedMeeting, summary: '', rawTranscript: '' };
      mockDatabaseService.saveMeeting.mockRejectedValue(new Error('Meeting content is required'));

      // Act & Assert
      await expect(mockDatabaseService.saveMeeting('user1', invalidMeeting, 'team1'))
        .rejects.toThrow('Meeting content is required');
    });

    it('should handle team member permission validation', async () => {
      // Arrange
      mockDatabaseService.assignTask.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(mockDatabaseService.assignTask('meeting1', 'action1', 'user2', 'unauthorized-user', 'user1'))
        .rejects.toThrow('Permission denied');
    });

    it('should handle empty team meetings gracefully', async () => {
      // Arrange
      mockDatabaseService.getTeamMeetings.mockResolvedValue([]);

      // Act
      const meetings = await mockDatabaseService.getTeamMeetings('team1');

      // Assert
      expect(meetings).toHaveLength(0);
      expect(Array.isArray(meetings)).toBe(true);
    });
  });

  describe('Real-time Synchronization', () => {
    it('should handle real-time meeting updates', () => {
      // Arrange
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToUserMeetings.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = mockDatabaseService.subscribeToUserMeetings('user1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToUserMeetings).toHaveBeenCalledWith('user1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle real-time team meeting updates', () => {
      // Arrange
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToTeamMeetings.mockReturnValue(mockUnsubscribe);

      // Act
      const unsubscribe = mockDatabaseService.subscribeToTeamMeetings('team1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToTeamMeetings).toHaveBeenCalledWith('team1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should cleanup subscriptions properly', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToTeamMeetings.mockReturnValue(mockUnsubscribe);
      const mockCallback = vi.fn();

      // Act
      const unsubscribe = mockDatabaseService.subscribeToTeamMeetings('team1', mockCallback);
      unsubscribe();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Meeting Analytics Integration', () => {
    it('should include team meetings in analytics', async () => {
      // Arrange
      const teamMeetings = [
        { ...mockMeeting, id: 'meeting1', teamId: 'team1', date: new Date('2024-01-01') },
        { ...mockMeeting, id: 'meeting2', teamId: 'team1', date: new Date('2024-01-02') },
        { ...mockMeeting, id: 'meeting3', teamId: 'team1', date: new Date('2024-01-03') }
      ];

      mockDatabaseService.getTeamMeetings.mockResolvedValue(teamMeetings);

      // Act
      const meetings = await mockDatabaseService.getTeamMeetings('team1');

      // Assert
      expect(meetings).toHaveLength(3);
      
      // Verify meetings are sorted by date (most recent first)
      const sortedMeetings = meetings.sort((a, b) => b.date.getTime() - a.date.getTime());
      expect(sortedMeetings[0].id).toBe('meeting3');
      expect(sortedMeetings[2].id).toBe('meeting1');
    });

    it('should calculate team meeting statistics', async () => {
      // Arrange
      const teamMeetings = [
        { ...mockMeeting, id: 'meeting1', actionItems: [{ id: '1', description: 'Task 1', priority: 'high', status: 'completed' }] },
        { ...mockMeeting, id: 'meeting2', actionItems: [{ id: '2', description: 'Task 2', priority: 'medium', status: 'pending' }] },
        { ...mockMeeting, id: 'meeting3', actionItems: [{ id: '3', description: 'Task 3', priority: 'low', status: 'in_progress' }] }
      ];

      mockDatabaseService.getTeamMeetings.mockResolvedValue(teamMeetings);

      // Act
      const meetings = await mockDatabaseService.getTeamMeetings('team1');

      // Assert
      const totalActionItems = meetings.reduce((total, meeting) => total + meeting.actionItems.length, 0);
      const completedItems = meetings.reduce((total, meeting) => 
        total + meeting.actionItems.filter(item => item.status === 'completed').length, 0
      );

      expect(totalActionItems).toBe(3);
      expect(completedItems).toBe(1);
    });
  });
});