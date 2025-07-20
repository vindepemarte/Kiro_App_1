import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamAwareMeetingProcessor, getTeamAwareProcessor } from '../team-aware-processor';
import { TeamMember, AIResponse } from '../types';

// Mock dependencies
vi.mock('../gemini', () => ({
  getGeminiService: vi.fn(() => ({
    processTranscript: vi.fn()
  }))
}));

vi.mock('../team-service', () => ({
  getTeamService: vi.fn(() => ({
    getTeamMembers: vi.fn(),
    matchMultipleSpeakers: vi.fn(),
    matchSpeakerToTeamMember: vi.fn()
  }))
}));

vi.mock('../database', () => ({
  databaseService: {
    saveMeeting: vi.fn(),
    createNotification: vi.fn()
  }
}));

vi.mock('../notification-service', () => ({
  notificationService: {
    sendTaskAssignment: vi.fn()
  }
}));

describe('TeamAwareMeetingProcessor', () => {
  let processor: TeamAwareMeetingProcessor;
  let mockGeminiService: any;
  let mockTeamService: any;
  let mockDatabaseService: any;

  const sampleTeamMembers: TeamMember[] = [
    {
      userId: 'user1',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      role: 'admin',
      joinedAt: new Date(),
      status: 'active'
    },
    {
      userId: 'user2',
      email: 'jane.smith@example.com',
      displayName: 'Jane Smith',
      role: 'member',
      joinedAt: new Date(),
      status: 'active'
    }
  ];

  const sampleTranscript = `
John Doe: Let's review the quarterly report and update our project timeline.
Jane Smith: I can handle the report review by Friday.
Bob Wilson: I'll update the timeline and schedule our next meeting.
John Doe: Great, let's also make sure we follow up with the client.
  `;

  const sampleAIResponse: AIResponse = {
    summary: 'Team discussed quarterly report and project timeline updates.',
    actionItems: [
      {
        description: 'Review quarterly report',
        owner: 'Jane Smith',
        priority: 'high',
        deadline: new Date('2024-12-31')
      },
      {
        description: 'Update project timeline',
        owner: 'Bob Wilson',
        priority: 'medium'
      },
      {
        description: 'Follow up with client',
        owner: 'John Doe',
        priority: 'medium'
      }
    ],
    confidence: 0.9
  };

  beforeEach(() => {
    processor = new TeamAwareMeetingProcessor();
    
    // Get mocked services
    const { getGeminiService } = require('../gemini');
    const { getTeamService } = require('../team-service');
    const { databaseService } = require('../database');
    
    mockGeminiService = getGeminiService();
    mockTeamService = getTeamService();
    mockDatabaseService = databaseService;

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('processTranscriptWithTeamContext', () => {
    it('should process transcript with team context and auto-assign tasks', async () => {
      // Setup mocks
      mockTeamService.getTeamMembers.mockResolvedValue(sampleTeamMembers);
      mockGeminiService.processTranscript.mockResolvedValue(sampleAIResponse);
      mockTeamService.matchMultipleSpeakers.mockReturnValue(new Map([
        ['John Doe', sampleTeamMembers[0]],
        ['Jane Smith', sampleTeamMembers[1]],
        ['Bob Wilson', null] // Unmatched speaker
      ]));
      mockTeamService.matchSpeakerToTeamMember.mockImplementation((speakerName: string) => {
        if (speakerName === 'Jane Smith') return sampleTeamMembers[1];
        if (speakerName === 'John Doe') return sampleTeamMembers[0];
        return null;
      });
      mockDatabaseService.saveMeeting.mockResolvedValue('meeting-123');

      // Execute
      const result = await processor.processTranscriptWithTeamContext(sampleTranscript, {
        userId: 'user1',
        teamId: 'team1',
        fileName: 'meeting.txt',
        fileSize: 1000
      });

      // Verify
      expect(result.meeting).toBeDefined();
      expect(result.meeting.teamId).toBe('team1');
      expect(result.assignmentSummary.totalTasks).toBe(3);
      expect(result.assignmentSummary.autoAssigned).toBeGreaterThan(0);
      expect(mockGeminiService.processTranscript).toHaveBeenCalledWith(sampleTranscript, sampleTeamMembers);
      expect(mockDatabaseService.saveMeeting).toHaveBeenCalled();
    });

    it('should process personal meeting without team context', async () => {
      // Setup mocks
      mockGeminiService.processTranscript.mockResolvedValue(sampleAIResponse);
      mockDatabaseService.saveMeeting.mockResolvedValue('meeting-123');

      // Execute
      const result = await processor.processTranscriptWithTeamContext(sampleTranscript, {
        userId: 'user1'
      });

      // Verify
      expect(result.meeting).toBeDefined();
      expect(result.meeting.teamId).toBeUndefined();
      expect(result.assignmentSummary.totalTasks).toBe(3);
      expect(result.assignmentSummary.autoAssigned).toBe(0); // No team members to assign to
      expect(mockGeminiService.processTranscript).toHaveBeenCalledWith(sampleTranscript, []);
      expect(mockTeamService.getTeamMembers).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockGeminiService.processTranscript.mockRejectedValue(new Error('AI processing failed'));

      // Execute and verify error
      await expect(
        processor.processTranscriptWithTeamContext(sampleTranscript, {
          userId: 'user1',
          teamId: 'team1'
        })
      ).rejects.toThrow('Team-aware processing failed');
    });
  });

  describe('speaker name extraction', () => {
    it('should extract speaker names from transcript', () => {
      const transcript = `
John Doe: Let's start the meeting.
Jane Smith: I agree with the proposal.
[Bob Wilson]: What about the timeline?
Alice Johnson said we need more time.
      `;

      // Access private method through any cast for testing
      const speakerNames = (processor as any).extractSpeakerNames(transcript);
      
      expect(speakerNames).toContain('John Doe');
      expect(speakerNames).toContain('Jane Smith');
      expect(speakerNames).toContain('Bob Wilson');
      expect(speakerNames).toContain('Alice Johnson');
    });

    it('should filter out false positives', () => {
      const transcript = `
Meeting: This is the agenda
Action: Review the document
123: Invalid speaker
      `;

      const speakerNames = (processor as any).extractSpeakerNames(transcript);
      
      expect(speakerNames).not.toContain('Meeting');
      expect(speakerNames).not.toContain('Action');
      expect(speakerNames).not.toContain('123');
    });
  });

  describe('task assignment', () => {
    it('should auto-assign tasks based on AI suggestions', async () => {
      const actionItems = [
        {
          id: 'task1',
          description: 'Review quarterly report',
          owner: 'Jane Smith',
          priority: 'high' as const,
          status: 'pending' as const
        }
      ];

      const result = await (processor as any).autoAssignTasks(
        actionItems,
        new Map([['Jane Smith', sampleTeamMembers[1]]]),
        sampleTeamMembers,
        'user1'
      );

      expect(result.assignedTasks).toHaveLength(1);
      expect(result.assignedTasks[0].assigneeId).toBe('user2');
      expect(result.assignedTasks[0].assigneeName).toBe('Jane Smith');
      expect(result.unassignedTasks).toHaveLength(0);
    });

    it('should leave tasks unassigned when no match found', async () => {
      const actionItems = [
        {
          id: 'task1',
          description: 'Review quarterly report',
          owner: 'Unknown Person',
          priority: 'high' as const,
          status: 'pending' as const
        }
      ];

      const result = await (processor as any).autoAssignTasks(
        actionItems,
        new Map(),
        sampleTeamMembers,
        'user1'
      );

      expect(result.assignedTasks).toHaveLength(0);
      expect(result.unassignedTasks).toHaveLength(1);
    });
  });

  describe('manual task assignment', () => {
    it('should manually assign task to team member', async () => {
      const mockMeeting = {
        id: 'meeting-123',
        actionItems: [
          {
            id: 'task1',
            description: 'Review report',
            status: 'pending'
          }
        ]
      };

      mockDatabaseService.assignTask.mockResolvedValue(undefined);
      mockDatabaseService.getMeetingById.mockResolvedValue(mockMeeting);

      await processor.manuallyAssignTask('meeting-123', 'task1', 'user2', 'user1');

      expect(mockDatabaseService.assignTask).toHaveBeenCalledWith(
        'meeting-123',
        'task1',
        'user2',
        'user1'
      );
      expect(mockDatabaseService.createNotification).toHaveBeenCalled();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getTeamAwareProcessor();
      const instance2 = getTeamAwareProcessor();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('suggestions for unassigned tasks', () => {
    it('should provide suggestions for unassigned tasks', () => {
      const unassignedTasks = [
        {
          id: 'task1',
          description: 'Review report',
          priority: 'high' as const,
          status: 'pending' as const
        }
      ];

      const speakerMatches = new Map([
        ['John Doe', sampleTeamMembers[0]]
      ]);

      const suggestions = processor.getSuggestionsForUnassignedTasks(
        unassignedTasks,
        sampleTeamMembers,
        speakerMatches
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].task).toBe(unassignedTasks[0]);
      expect(suggestions[0].suggestions).toContain(sampleTeamMembers[0]);
      expect(suggestions[0].suggestions).toContain(sampleTeamMembers[1]);
    });
  });
});