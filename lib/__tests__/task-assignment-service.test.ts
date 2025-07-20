// Task assignment service tests

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { 
  TaskAssignmentServiceImpl, 
  createTaskAssignmentService 
} from '../task-assignment-service';
import { 
  ActionItem, 
  Meeting, 
  TeamMember, 
  TaskAssignmentData,
  CreateNotificationData
} from '../types';

// Mock dependencies
const mockDatabaseService = {
  getMeetingById: vi.fn(),
  updateMeeting: vi.fn(),
  getUserMeetings: vi.fn(),
  createNotification: vi.fn(),
};

const mockTeamService = {
  matchSpeakerToTeamMember: vi.fn(),
  getTeamMembers: vi.fn(),
};

const mockNotificationService = {
  sendTaskAssignment: vi.fn(),
};

describe('TaskAssignmentService', () => {
  let taskAssignmentService: TaskAssignmentServiceImpl;
  let mockMeeting: Meeting;
  let mockTeamMembers: TeamMember[];
  let mockActionItems: ActionItem[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    taskAssignmentService = new TaskAssignmentServiceImpl(
      mockDatabaseService as any,
      mockTeamService as any,
      mockNotificationService as any
    );

    // Mock data setup
    mockActionItems = [
      {
        id: 'task-1',
        description: 'Review the quarterly report',
        priority: 'high',
        status: 'pending',
        owner: 'John Doe',
      },
      {
        id: 'task-2',
        description: 'Update the project timeline',
        priority: 'medium',
        status: 'pending',
        assigneeId: 'user-2',
        assigneeName: 'Jane Smith',
      },
      {
        id: 'task-3',
        description: 'Schedule follow-up meeting',
        priority: 'low',
        status: 'pending',
      },
    ];

    mockMeeting = {
      id: 'meeting-1',
      title: 'Team Standup',
      date: new Date('2024-01-15'),
      summary: 'Weekly team standup meeting',
      actionItems: mockActionItems,
      rawTranscript: `John Doe: Let's review the quarterly report.
Jane Smith: I'll update the project timeline.
Bob Wilson: We should schedule a follow-up meeting.`,
      teamId: 'team-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    mockTeamMembers = [
      {
        userId: 'user-1',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        role: 'admin',
        joinedAt: new Date('2024-01-01'),
        status: 'active',
      },
      {
        userId: 'user-2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        role: 'member',
        joinedAt: new Date('2024-01-01'),
        status: 'active',
      },
      {
        userId: 'user-3',
        email: 'bob.wilson@example.com',
        displayName: 'Bob Wilson',
        role: 'member',
        joinedAt: new Date('2024-01-01'),
        status: 'active',
      },
    ];
  });

  describe('autoAssignTasksFromTranscript', () => {
    it('should automatically assign tasks based on speaker names', async () => {
      // Setup mocks - the service will call matchSpeakerToTeamMember for each task's owner
      mockTeamService.matchSpeakerToTeamMember
        .mockReturnValueOnce(mockTeamMembers[0]) // For task-1 owner "John Doe"
        .mockReturnValueOnce(null) // For task-3 (no owner)
        .mockReturnValueOnce(null); // Additional calls

      mockNotificationService.sendTaskAssignment.mockResolvedValue('notification-1');

      const result = await taskAssignmentService.autoAssignTasksFromTranscript(
        mockMeeting,
        mockTeamMembers,
        'user-admin'
      );

      expect(result).toHaveLength(3);
      expect(result[0].assigneeId).toBe('user-1'); // John Doe matched
      expect(result[0].assigneeName).toBe('John Doe');
      expect(result[1].assigneeId).toBe('user-2'); // Already assigned, should remain
      expect(result[2].assigneeId).toBeUndefined(); // No match found for task-3
    });

    it('should handle cases where no team members match speakers', async () => {
      mockTeamService.matchSpeakerToTeamMember.mockReturnValue(null);

      const result = await taskAssignmentService.autoAssignTasksFromTranscript(
        mockMeeting,
        mockTeamMembers,
        'user-admin'
      );

      expect(result).toHaveLength(3);
      expect(result[0].assigneeId).toBeUndefined();
      expect(result[2].assigneeId).toBeUndefined();
    });

    it('should skip already assigned tasks', async () => {
      const result = await taskAssignmentService.autoAssignTasksFromTranscript(
        mockMeeting,
        mockTeamMembers,
        'user-admin'
      );

      expect(result[1].assigneeId).toBe('user-2'); // Should remain assigned
    });

    it('should handle empty team members', async () => {
      const result = await taskAssignmentService.autoAssignTasksFromTranscript(
        mockMeeting,
        [],
        'user-admin'
      );

      expect(result).toEqual(mockMeeting.actionItems);
    });
  });

  describe('assignTaskToMember', () => {
    it('should successfully assign a task to a team member', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTeamService.getTeamMembers.mockResolvedValue(mockTeamMembers);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);
      mockNotificationService.sendTaskAssignment.mockResolvedValue('notification-1');

      const result = await taskAssignmentService.assignTaskToMember(
        'meeting-1',
        'task-1',
        'user-2',
        'user-admin',
        'meeting-owner'
      );

      expect(result).toBe(true);
      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'meeting-owner',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              assigneeId: 'user-2',
              assigneeName: 'Jane Smith',
              assignedBy: 'user-admin',
            })
          ])
        })
      );
      expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalled();
    });

    it('should throw error when meeting not found', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(null);

      await expect(
        taskAssignmentService.assignTaskToMember(
          'meeting-1',
          'task-1',
          'user-2',
          'user-admin',
          'meeting-owner'
        )
      ).rejects.toThrow('Meeting not found');
    });

    it('should throw error when task not found', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

      await expect(
        taskAssignmentService.assignTaskToMember(
          'meeting-1',
          'invalid-task',
          'user-2',
          'user-admin',
          'meeting-owner'
        )
      ).rejects.toThrow('Task not found');
    });

    it('should throw error when assignee not found', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTeamService.getTeamMembers.mockResolvedValue(mockTeamMembers);

      await expect(
        taskAssignmentService.assignTaskToMember(
          'meeting-1',
          'task-1',
          'invalid-user',
          'user-admin',
          'meeting-owner'
        )
      ).rejects.toThrow('Assignee not found');
    });
  });

  describe('updateTaskStatus', () => {
    it('should successfully update task status', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('notification-1');

      const result = await taskAssignmentService.updateTaskStatus(
        'meeting-1',
        'task-1',
        'completed',
        'user-1',
        'meeting-owner'
      );

      expect(result).toBe(true);
      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'meeting-owner',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              status: 'completed',
            })
          ])
        })
      );
    });

    it('should send completion notification when task is completed', async () => {
      const meetingWithAssignedTask = {
        ...mockMeeting,
        actionItems: [
          {
            ...mockActionItems[0],
            assignedBy: 'user-admin',
            assigneeId: 'user-1',
          }
        ]
      };

      mockDatabaseService.getMeetingById.mockResolvedValue(meetingWithAssignedTask);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('notification-1');

      await taskAssignmentService.updateTaskStatus(
        'meeting-1',
        'task-1',
        'completed',
        'user-1',
        'meeting-owner'
      );

      expect(mockDatabaseService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-admin',
          type: 'task_completed',
          title: 'Task Completed',
        })
      );
    });
  });

  describe('bulkAssignTasks', () => {
    it('should successfully assign multiple tasks', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTeamService.getTeamMembers.mockResolvedValue(mockTeamMembers);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);
      mockNotificationService.sendTaskAssignment.mockResolvedValue('notification-1');

      const assignments = [
        { taskId: 'task-1', assigneeId: 'user-1' },
        { taskId: 'task-3', assigneeId: 'user-3' },
      ];

      const result = await taskAssignmentService.bulkAssignTasks(
        'meeting-1',
        assignments,
        'user-admin',
        'meeting-owner'
      );

      expect(result).toBe(true);
      expect(mockDatabaseService.updateMeeting).toHaveBeenCalledWith(
        'meeting-1',
        'meeting-owner',
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'task-1',
              assigneeId: 'user-1',
            }),
            expect.objectContaining({
              id: 'task-3',
              assigneeId: 'user-3',
            })
          ])
        })
      );
      expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid task IDs', async () => {
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTeamService.getTeamMembers.mockResolvedValue(mockTeamMembers);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      const assignments = [
        { taskId: 'task-1', assigneeId: 'user-1' },
        { taskId: 'invalid-task', assigneeId: 'user-2' },
      ];

      const result = await taskAssignmentService.bulkAssignTasks(
        'meeting-1',
        assignments,
        'user-admin',
        'meeting-owner'
      );

      expect(result).toBe(true);
      // Should only update valid task
      expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTasksForUser', () => {
    it('should return tasks assigned to the user', async () => {
      const meetings = [
        {
          ...mockMeeting,
          actionItems: [
            { ...mockActionItems[0], assigneeId: 'user-1' },
            { ...mockActionItems[1], assigneeId: 'user-2' },
          ]
        }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValue(meetings);

      const result = await taskAssignmentService.getTasksForUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].assigneeId).toBe('user-1');
    });

    it('should filter by team ID when provided', async () => {
      const meetings = [
        {
          ...mockMeeting,
          teamId: 'team-1',
          actionItems: [{ ...mockActionItems[0], assigneeId: 'user-1' }]
        },
        {
          ...mockMeeting,
          id: 'meeting-2',
          teamId: 'team-2',
          actionItems: [{ ...mockActionItems[1], assigneeId: 'user-1' }]
        }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValue(meetings);

      const result = await taskAssignmentService.getTasksForUser('user-1', 'team-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });

    it('should sort tasks by priority and deadline', async () => {
      const meetings = [
        {
          ...mockMeeting,
          actionItems: [
            { 
              ...mockActionItems[0], 
              assigneeId: 'user-1', 
              priority: 'low' as const,
              deadline: new Date('2024-01-20')
            },
            { 
              ...mockActionItems[1], 
              assigneeId: 'user-1', 
              priority: 'high' as const,
              deadline: new Date('2024-01-18')
            },
          ]
        }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValue(meetings);

      const result = await taskAssignmentService.getTasksForUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe('high'); // High priority first
      expect(result[1].priority).toBe('low');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return only overdue tasks', async () => {
      // Clear all previous mocks
      vi.clearAllMocks();
      
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      
      const meetings = [
        {
          id: 'meeting-overdue-test',
          title: 'Overdue Test Meeting',
          date: new Date('2024-01-15'),
          summary: 'Test meeting for overdue tasks',
          rawTranscript: 'Test transcript',
          teamId: 'team-1',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          actionItems: [
            { 
              id: 'overdue-task-1',
              description: 'Overdue task',
              priority: 'high' as const,
              status: 'pending' as const,
              assigneeId: 'user-1',
              deadline: pastDate,
            },
            { 
              id: 'future-task',
              description: 'Future task',
              priority: 'medium' as const,
              status: 'pending' as const,
              assigneeId: 'user-1',
              deadline: futureDate,
            },
            { 
              id: 'completed-overdue-task',
              description: 'Completed overdue task',
              priority: 'low' as const,
              status: 'completed' as const,
              assigneeId: 'user-1',
              deadline: pastDate,
            },
          ]
        }
      ];

      mockDatabaseService.getUserMeetings.mockResolvedValueOnce(meetings);

      const result = await taskAssignmentService.getOverdueTasks('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('overdue-task-1');
      expect(result[0].deadline).toEqual(pastDate);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('extractSpeakerNames', () => {
    it('should extract speaker names from various transcript formats', () => {
      const transcript = `John Doe: Let's start the meeting.
Jane Smith - I have an update.
[Bob Wilson] Can we discuss the timeline?
(Alice Johnson) I agree with that.
Mike Davis | What about the budget?
Sarah Connor > Let's move forward.`;

      const result = taskAssignmentService.extractSpeakerNames(transcript);

      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Bob Wilson');
      expect(result).toContain('Alice Johnson');
      expect(result).toContain('Mike Davis');
      expect(result).toContain('Sarah Connor');
    });

    it('should filter out invalid speaker names', () => {
      const transcript = `Meeting: This is a meeting transcript.
John Doe: Let's start.
Audio: Recording started.
Jane Smith: I have an update.`;

      const result = taskAssignmentService.extractSpeakerNames(transcript);

      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).not.toContain('Meeting');
      expect(result).not.toContain('Audio');
    });
  });

  describe('matchSpeakersToTeamMembers', () => {
    it('should match speakers to team members', () => {
      const speakerNames = ['John Doe', 'Jane Smith', 'Unknown Speaker'];
      
      mockTeamService.matchSpeakerToTeamMember
        .mockReturnValueOnce(mockTeamMembers[0])
        .mockReturnValueOnce(mockTeamMembers[1])
        .mockReturnValueOnce(null);

      const result = taskAssignmentService.matchSpeakersToTeamMembers(
        speakerNames,
        mockTeamMembers
      );

      expect(result.get('John Doe')).toBe(mockTeamMembers[0]);
      expect(result.get('Jane Smith')).toBe(mockTeamMembers[1]);
      expect(result.get('Unknown Speaker')).toBeNull();
    });
  });

  describe('createTaskAssignmentService factory', () => {
    it('should create a task assignment service instance', () => {
      const service = createTaskAssignmentService(
        mockDatabaseService as any,
        mockTeamService as any,
        mockNotificationService as any
      );

      expect(service).toBeInstanceOf(TaskAssignmentServiceImpl);
    });
  });
});