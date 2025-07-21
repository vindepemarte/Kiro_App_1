// Integration tests for complete system workflows

import { TaskManagementServiceImpl } from '../task-management-service';
import { RealTimeSyncEngineImpl } from '../real-time-sync-engine';
import { NotificationManagementServiceImpl } from '../notification-management-service';
import { AnalyticsServiceImpl } from '../analytics-service';
import { Meeting, Team, User, TaskWithContext } from '../types';

// Mock services
const mockDatabaseService = {
  getUserMeetings: jest.fn(),
  getTeamMeetings: jest.fn(),
  getUserTeams: jest.fn(),
  getTeamById: jest.fn(),
  getUserProfile: jest.fn(),
  updateMeeting: jest.fn(),
  createNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  subscribeToUserMeetings: jest.fn(),
  subscribeToTeamMeetings: jest.fn(),
  subscribeToUserTeams: jest.fn(),
  subscribeToUserNotifications: jest.fn(),
} as any;

describe('System Integration Tests', () => {
  let taskService: TaskManagementServiceImpl;
  let syncEngine: RealTimeSyncEngineImpl;
  let notificationService: NotificationManagementServiceImpl;
  let analyticsService: AnalyticsServiceImpl;

  beforeEach(() => {
    taskService = new TaskManagementServiceImpl(mockDatabaseService);
    syncEngine = new RealTimeSyncEngineImpl(mockDatabaseService, taskService);
    notificationService = new NotificationManagementServiceImpl(mockDatabaseService);
    analyticsService = new AnalyticsServiceImpl(mockDatabaseService, taskService);
    jest.clearAllMocks();
  });

  describe('Complete Task Assignment Workflow', () => {
    const mockUser: User = {
      uid: 'user-1',
      email: 'john@example.com',
      displayName: 'John Doe',
      isAnonymous: false
    };

    const mockTeam: Team = {
      id: 'team-1',
      name: 'Development Team',
      description: 'Main development team',
      createdBy: 'user-1',
      members: [
        {
          userId: 'user-1',
          email: 'john@example.com',
          displayName: 'John Doe',
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        },
        {
          userId: 'user-2',
          email: 'jane@example.com',
          displayName: 'Jane Smith',
          role: 'member',
          status: 'active',
          joinedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockMeeting: Meeting = {
      id: 'meeting-1',
      title: 'Team Standup',
      date: new Date(),
      summary: 'Weekly standup meeting',
      actionItems: [
        {
          id: 'task-1',
          description: 'Complete user authentication feature',
          priority: 'high',
          status: 'pending',
          owner: 'John Doe'
        },
        {
          id: 'task-2',
          description: 'Review pull request for dashboard',
          priority: 'medium',
          status: 'pending',
          owner: 'Jane Smith'
        }
      ],
      rawTranscript: 'Meeting transcript...',
      teamId: 'team-1',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should complete end-to-end task assignment workflow', async () => {
      // Setup mocks
      mockDatabaseService.getTeamById.mockResolvedValue(mockTeam);
      mockDatabaseService.getUserProfile.mockResolvedValue({
        displayName: 'John Doe'
      });
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      // Step 1: Extract tasks from meeting
      const extractedTasks = await taskService.extractTasksFromMeeting(mockMeeting, mockTeam.id);
      
      expect(extractedTasks).toHaveLength(2);
      expect(extractedTasks[0]).toMatchObject({
        meetingId: 'meeting-1',
        meetingTitle: 'Team Standup',
        teamId: 'team-1',
        teamName: 'Development Team'
      });

      // Step 2: Auto-assign tasks to team members
      await taskService.autoAssignTasksToTeamMembers(mockMeeting, mockTeam);

      // Step 3: Verify task assignment
      const task1Match = taskService.matchTaskToTeamMember(mockMeeting.actionItems[0], mockTeam.members);
      const task2Match = taskService.matchTaskToTeamMember(mockMeeting.actionItems[1], mockTeam.members);

      expect(task1Match?.displayName).toBe('John Doe');
      expect(task2Match?.displayName).toBe('Jane Smith');

      // Step 4: Update task status
      await taskService.updateTaskStatus('task-1', 'meeting-1', 'in_progress', 'user-1');

      expect(mockDatabaseService.updateMeeting).toHaveBeenCalled();
    });

    it('should handle task reassignment workflow', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockDatabaseService.getUserProfile.mockResolvedValue({
        displayName: 'Jane Smith'
      });
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      // Reassign task from one user to another
      await taskService.reassignTask('task-1', 'meeting-1', 'user-2', 'user-1');

      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'user-1',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              assigneeId: 'user-2',
              assigneeName: 'Jane Smith'
            })
          ])
        })
      );
    });
  });

  describe('Real-time Synchronization Workflow', () => {
    it('should sync all user data successfully', async () => {
      const mockMeetings = [{ id: 'meeting-1', title: 'Meeting 1' }];
      const mockTasks = [{ id: 'task-1', description: 'Task 1' }];
      const mockTeams = [{ id: 'team-1', name: 'Team 1' }];
      const mockNotifications = [{ id: 'notif-1', title: 'Notification 1' }];

      mockDatabaseService.getUserMeetings.mockResolvedValue(mockMeetings);
      taskService.getUserTasks = jest.fn().mockResolvedValue(mockTasks);
      mockDatabaseService.getUserTeams.mockResolvedValue(mockTeams);
      mockDatabaseService.getUserNotifications.mockResolvedValue(mockNotifications);

      const snapshot = await syncEngine.syncAllUserData('user-1');

      expect(snapshot).toMatchObject({
        meetings: mockMeetings,
        tasks: mockTasks,
        teams: mockTeams,
        notifications: mockNotifications
      });
      expect(snapshot.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle connection state changes', () => {
      const initialState = syncEngine.getConnectionState();
      
      syncEngine.handleConnectionStateChange(false);
      expect(syncEngine.getConnectionState()).toBe(false);
      
      syncEngine.handleConnectionStateChange(true);
      expect(syncEngine.getConnectionState()).toBe(true);
    });

    it('should set up real-time subscriptions', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockDatabaseService.subscribeToUserMeetings.mockReturnValue(mockUnsubscribe);

      const unsubscribe = syncEngine.subscribeMeetingUpdates('user-1', mockCallback);

      expect(mockDatabaseService.subscribeToUserMeetings).toHaveBeenCalledWith('user-1', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Notification System Workflow', () => {
    it('should send task assignment notification', async () => {
      mockDatabaseService.getUserProfile.mockResolvedValue({
        preferences: {
          notifications: {
            taskAssignments: true
          }
        }
      });
      mockDatabaseService.createNotification.mockResolvedValue('notif-1');

      await notificationService.sendTaskAssignmentNotification(
        'task-1',
        'Complete authentication feature',
        'user-2',
        'Jane Smith',
        'Team Standup',
        'user-1',
        'team-1',
        'Development Team'
      );

      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'task_assignment',
          title: 'New Task Assignment',
          message: expect.stringContaining('Complete authentication feature')
        })
      );
    });

    it('should send team invitation notification', async () => {
      mockDatabaseService.createNotification.mockResolvedValue('notif-1');

      await notificationService.sendTeamInvitationNotification(
        'team-1',
        'Development Team',
        'user-1',
        'John Doe',
        'user-2',
        'jane@example.com',
        'Jane Smith'
      );

      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          type: 'team_invitation',
          title: 'Team Invitation: Development Team'
        })
      );
    });

    it('should respect notification preferences', async () => {
      mockDatabaseService.getUserProfile.mockResolvedValue({
        preferences: {
          notifications: {
            taskAssignments: false
          }
        }
      });

      await notificationService.sendTaskAssignmentNotification(
        'task-1',
        'Task description',
        'user-2',
        'Jane Smith',
        'Meeting',
        'user-1'
      );

      expect(mockDatabaseService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Analytics System Workflow', () => {
    it('should calculate user analytics correctly', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          createdAt: new Date(),
          teamId: 'team-1',
          actionItems: []
        }
      ];

      const mockTasks: TaskWithContext[] = [
        {
          id: 'task-1',
          description: 'Task 1',
          priority: 'high',
          status: 'completed',
          assigneeId: 'user-1',
          assigneeName: 'John Doe',
          meetingId: 'meeting-1',
          meetingTitle: 'Meeting 1',
          meetingDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'task-2',
          description: 'Task 2',
          priority: 'medium',
          status: 'pending',
          assigneeId: 'user-1',
          assigneeName: 'John Doe',
          meetingId: 'meeting-1',
          meetingTitle: 'Meeting 1',
          meetingDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockTeams = [{ id: 'team-1', name: 'Team 1' }];

      mockDatabaseService.getUserMeetings.mockResolvedValue(mockMeetings);
      taskService.getUserTasks = jest.fn().mockResolvedValue(mockTasks);
      mockDatabaseService.getUserTeams.mockResolvedValue(mockTeams);

      const analytics = await analyticsService.getUserAnalytics('user-1');

      expect(analytics).toMatchObject({
        totalMeetings: 1,
        totalTasks: 2,
        completedTasks: 1,
        pendingTasks: 1,
        completionRate: 50,
        totalTeams: 1,
        teamMeetings: 1
      });
    });

    it('should handle empty data gracefully', async () => {
      mockDatabaseService.getUserMeetings.mockResolvedValue([]);
      taskService.getUserTasks = jest.fn().mockResolvedValue([]);
      mockDatabaseService.getUserTeams.mockResolvedValue([]);

      const analytics = await analyticsService.getUserAnalytics('user-1');

      expect(analytics).toMatchObject({
        totalMeetings: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
        totalTeams: 0
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabaseService.getUserMeetings.mockRejectedValue(new Error('Database error'));

      await expect(taskService.getUserTasks('user-1')).rejects.toThrow();
    });

    it('should handle missing team data', async () => {
      mockDatabaseService.getTeamById.mockResolvedValue(null);

      const result = await taskService.extractTasksFromMeeting({
        id: 'meeting-1',
        title: 'Meeting',
        date: new Date(),
        summary: 'Summary',
        actionItems: [{ id: 'task-1', description: 'Task', priority: 'medium', status: 'pending' }],
        rawTranscript: 'transcript',
        teamId: 'nonexistent-team',
        createdAt: new Date(),
        updatedAt: new Date()
      }, 'nonexistent-team');

      expect(result[0].teamName).toBeUndefined();
    });

    it('should handle empty action items', async () => {
      const result = await taskService.extractTasksFromMeeting({
        id: 'meeting-1',
        title: 'Meeting',
        date: new Date(),
        summary: 'Summary',
        actionItems: [],
        rawTranscript: 'transcript',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(result).toHaveLength(0);
    });
  });

  afterEach(() => {
    // Cleanup any subscriptions or resources
    syncEngine.cleanup();
  });
});

export {};