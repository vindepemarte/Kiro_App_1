// Unit tests for task extraction service

import { TaskManagementServiceImpl } from '../task-management-service';
import { Meeting, Team, TaskWithContext } from '../types';

// Mock database service
const mockDatabaseService = {
  getTeamById: jest.fn(),
  getUserProfile: jest.fn(),
  updateMeeting: jest.fn(),
  createNotification: jest.fn(),
  getUserMeetings: jest.fn(),
  getUserTeams: jest.fn(),
  getTeamMeetings: jest.fn(),
  subscribeToUserMeetings: jest.fn(),
  subscribeToTeamMeetings: jest.fn(),
} as any;

describe('TaskManagementService', () => {
  let taskService: TaskManagementServiceImpl;

  beforeEach(() => {
    taskService = new TaskManagementServiceImpl(mockDatabaseService);
    jest.clearAllMocks();
  });

  describe('extractTasksFromMeeting', () => {
    const mockMeeting: Meeting = {
      id: 'meeting-1',
      title: 'Team Standup',
      date: new Date('2024-01-15'),
      summary: 'Weekly standup meeting',
      actionItems: [
        {
          id: 'task-1',
          description: 'Complete user authentication',
          priority: 'high',
          status: 'pending',
          assigneeId: 'user-1',
          assigneeName: 'John Doe'
        },
        {
          id: 'task-2',
          description: 'Review pull request',
          priority: 'medium',
          status: 'pending',
          assigneeId: 'user-2',
          assigneeName: 'Jane Smith'
        }
      ],
      rawTranscript: 'Meeting transcript...',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    };

    const mockTeam: Team = {
      id: 'team-1',
      name: 'Development Team',
      description: 'Main dev team',
      createdBy: 'user-1',
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should extract tasks with meeting context', async () => {
      mockDatabaseService.getTeamById.mockResolvedValue(mockTeam);

      const result = await taskService.extractTasksFromMeeting(mockMeeting, 'team-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'task-1',
        description: 'Complete user authentication',
        meetingId: 'meeting-1',
        meetingTitle: 'Team Standup',
        teamId: 'team-1',
        teamName: 'Development Team'
      });
    });

    it('should extract tasks without team context', async () => {
      const result = await taskService.extractTasksFromMeeting(mockMeeting);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'task-1',
        description: 'Complete user authentication',
        meetingId: 'meeting-1',
        meetingTitle: 'Team Standup',
        teamId: undefined,
        teamName: undefined
      });
    });

    it('should handle empty action items', async () => {
      const meetingWithNoTasks = { ...mockMeeting, actionItems: [] };
      
      const result = await taskService.extractTasksFromMeeting(meetingWithNoTasks);

      expect(result).toHaveLength(0);
    });

    it('should handle team not found', async () => {
      mockDatabaseService.getTeamById.mockResolvedValue(null);

      const result = await taskService.extractTasksFromMeeting(mockMeeting, 'nonexistent-team');

      expect(result).toHaveLength(2);
      expect(result[0].teamName).toBeUndefined();
    });
  });

  describe('assignTaskToUser', () => {
    const mockMeeting: Meeting = {
      id: 'meeting-1',
      title: 'Team Meeting',
      date: new Date(),
      summary: 'Meeting summary',
      actionItems: [
        {
          id: 'task-1',
          description: 'Complete feature',
          priority: 'high',
          status: 'pending'
        }
      ],
      rawTranscript: 'transcript',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should assign task to user successfully', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockDatabaseService.getUserProfile.mockResolvedValue({
        displayName: 'John Doe'
      });
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      await taskService.assignTaskToUser('task-1', 'meeting-1', 'user-1', 'admin-1');

      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'admin-1',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              assigneeId: 'user-1',
              assigneeName: 'John Doe',
              assignedBy: 'admin-1'
            })
          ])
        })
      );
    });

    it('should throw error if meeting not found', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(null);

      await expect(
        taskService.assignTaskToUser('task-1', 'nonexistent-meeting', 'user-1', 'admin-1')
      ).rejects.toThrow('Meeting not found');
    });

    it('should throw error if task not found', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

      await expect(
        taskService.assignTaskToUser('nonexistent-task', 'meeting-1', 'user-1', 'admin-1')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getUserTasks', () => {
    it('should get all tasks assigned to user', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          actionItems: [
            { id: 'task-1', assigneeId: 'user-1', description: 'Task 1' },
            { id: 'task-2', assigneeId: 'user-2', description: 'Task 2' }
          ]
        }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValue(mockMeetings);
      mockDatabaseService.getUserTeams.mockResolvedValue([]);

      const result = await taskService.getUserTasks('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
      expect(result[0].assigneeId).toBe('user-1');
    });

    it('should handle user with no tasks', async () => {
      mockDatabaseService.getUserMeetings.mockResolvedValue([]);
      mockDatabaseService.getUserTeams.mockResolvedValue([]);

      const result = await taskService.getUserTasks('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateTaskStatus', () => {
    const mockMeeting: Meeting = {
      id: 'meeting-1',
      title: 'Meeting',
      date: new Date(),
      summary: 'Summary',
      actionItems: [
        {
          id: 'task-1',
          description: 'Task',
          priority: 'medium',
          status: 'pending'
        }
      ],
      rawTranscript: 'transcript',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update task status successfully', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      await taskService.updateTaskStatus('task-1', 'meeting-1', 'completed', 'user-1');

      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'user-1',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              status: 'completed'
            })
          ])
        })
      );
    });

    it('should throw error for invalid task status', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

      await expect(
        taskService.updateTaskStatus('task-1', 'meeting-1', 'invalid-status' as any, 'user-1')
      ).rejects.toThrow();
    });
  });

  describe('matchTaskToTeamMember', () => {
    const mockTeamMembers = [
      {
        userId: 'user-1',
        email: 'john@example.com',
        displayName: 'John Doe',
        role: 'member' as const,
        status: 'active' as const,
        joinedAt: new Date()
      },
      {
        userId: 'user-2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        role: 'member' as const,
        status: 'active' as const,
        joinedAt: new Date()
      }
    ];

    it('should match task by exact name', () => {
      const task = {
        id: 'task-1',
        description: 'Task for John',
        owner: 'John Doe',
        priority: 'medium' as const,
        status: 'pending' as const
      };

      const result = taskService.matchTaskToTeamMember(task, mockTeamMembers);

      expect(result?.displayName).toBe('John Doe');
    });

    it('should match task by partial name', () => {
      const task = {
        id: 'task-1',
        description: 'Task for Jane',
        owner: 'Jane',
        priority: 'medium' as const,
        status: 'pending' as const
      };

      const result = taskService.matchTaskToTeamMember(task, mockTeamMembers);

      expect(result?.displayName).toBe('Jane Smith');
    });

    it('should match task by email prefix', () => {
      const task = {
        id: 'task-1',
        description: 'Task for jane.smith',
        owner: 'jane.smith',
        priority: 'medium' as const,
        status: 'pending' as const
      };

      const result = taskService.matchTaskToTeamMember(task, mockTeamMembers);

      expect(result?.displayName).toBe('Jane Smith');
    });

    it('should return first member if no match found', () => {
      const task = {
        id: 'task-1',
        description: 'Task for unknown person',
        owner: 'Unknown Person',
        priority: 'medium' as const,
        status: 'pending' as const
      };

      const result = taskService.matchTaskToTeamMember(task, mockTeamMembers);

      expect(result?.displayName).toBe('John Doe'); // First member
    });

    it('should return null for empty team', () => {
      const task = {
        id: 'task-1',
        description: 'Task',
        owner: 'Someone',
        priority: 'medium' as const,
        status: 'pending' as const
      };

      const result = taskService.matchTaskToTeamMember(task, []);

      expect(result).toBeNull();
    });
  });
});

export {};