// Integration tests for team management workflow
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeamManagementService } from '../team-service';
import { DatabaseService } from '../database';
import { NotificationService } from '../notification-service';
import { Team, TeamMember, CreateTeamData, User } from '../types';

// Mock database service
const mockDatabaseService: jest.Mocked<DatabaseService> = {
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
  
  // Meeting operations (not used in team tests but required by interface)
  saveMeeting: vi.fn(),
  getUserMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  subscribeToUserMeetings: vi.fn(),
  getTeamMeetings: vi.fn(),
  subscribeToTeamMeetings: vi.fn(),
  assignTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTeamTasks: vi.fn(),
  enableOfflineSupport: vi.fn(),
  disableOfflineSupport: vi.fn(),
};

describe('Team Management Integration Tests', () => {
  let teamService: TeamManagementService;
  
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
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    teamService = new TeamManagementService(mockDatabaseService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Team Creation Workflow', () => {
    it('should create a team successfully', async () => {
      // Arrange
      const teamData: CreateTeamData = {
        name: 'New Team',
        description: 'A new test team',
        createdBy: 'user1'
      };
      
      mockDatabaseService.createTeam.mockResolvedValue('team1');

      // Act
      const teamId = await teamService.createTeam(teamData);

      // Assert
      expect(teamId).toBe('team1');
      expect(mockDatabaseService.createTeam).toHaveBeenCalledWith(teamData);
    });

    it('should validate team creation inputs', async () => {
      // Arrange
      const invalidTeamData: CreateTeamData = {
        name: '',
        description: 'A test team',
        createdBy: 'user1'
      };

      // Act & Assert
      await expect(teamService.createTeam(invalidTeamData))
        .rejects.toThrow('Team name is required');
    });

    it('should handle team creation errors gracefully', async () => {
      // Arrange
      const teamData: CreateTeamData = {
        name: 'New Team',
        description: 'A new test team',
        createdBy: 'user1'
      };
      
      mockDatabaseService.createTeam.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(teamService.createTeam(teamData))
        .rejects.toThrow();
    });
  });

  describe('Team Member Management Workflow', () => {
    beforeEach(() => {
      mockDatabaseService.getTeamById.mockResolvedValue(mockTeam);
      mockDatabaseService.searchUserByEmail.mockResolvedValue(mockUser2);
    });

    it('should invite user to team successfully', async () => {
      // Arrange
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('notification1');

      // Act
      await teamService.inviteUserToTeam('team1', 'user1', 'user2@example.com', 'User Two');

      // Assert
      expect(mockDatabaseService.addTeamMember).toHaveBeenCalled();
      expect(mockDatabaseService.createNotification).toHaveBeenCalled();
    });

    it('should prevent duplicate invitations', async () => {
      // Arrange
      const teamWithInvitedUser: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'invited'
          }
        ]
      };
      
      mockDatabaseService.getTeamById.mockResolvedValue(teamWithInvitedUser);

      // Act & Assert
      await expect(teamService.inviteUserToTeam('team1', 'user1', 'user2@example.com', 'User Two'))
        .rejects.toThrow('User already invited');
    });

    it('should accept team invitation successfully', async () => {
      // Arrange
      const mockNotifications = [
        {
          id: 'notification1',
          userId: 'user2',
          type: 'team_invitation' as const,
          title: 'Team Invitation',
          message: 'You have been invited to join Test Team',
          data: {
            teamId: 'team1',
            inviteeEmail: 'user2@example.com'
          },
          read: false,
          createdAt: new Date()
        }
      ];

      const teamWithInvitedUser: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'invited-123',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'invited'
          }
        ]
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue(mockNotifications);
      mockDatabaseService.getTeamById.mockResolvedValue(teamWithInvitedUser);
      mockDatabaseService.updateTeamMember.mockResolvedValue(true);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      // Act
      await teamService.acceptTeamInvitation('notification1', 'user2');

      // Assert
      expect(mockDatabaseService.removeTeamMember).toHaveBeenCalledWith('team1', 'invited-123');
      expect(mockDatabaseService.addTeamMember).toHaveBeenCalled();
      expect(mockDatabaseService.deleteNotification).toHaveBeenCalledWith('notification1');
    });

    it('should decline team invitation successfully', async () => {
      // Arrange
      const mockNotifications = [
        {
          id: 'notification1',
          userId: 'user2',
          type: 'team_invitation' as const,
          title: 'Team Invitation',
          message: 'You have been invited to join Test Team',
          data: {
            teamId: 'team1',
            inviteeEmail: 'user2@example.com'
          },
          read: false,
          createdAt: new Date()
        }
      ];

      const teamWithInvitedUser: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'invited-123',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'invited'
          }
        ]
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue(mockNotifications);
      mockDatabaseService.getTeamById.mockResolvedValue(teamWithInvitedUser);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      // Act
      await teamService.declineTeamInvitation('notification1', 'user2');

      // Assert
      expect(mockDatabaseService.removeTeamMember).toHaveBeenCalledWith('team1', 'invited-123');
      expect(mockDatabaseService.deleteNotification).toHaveBeenCalledWith('notification1');
    });

    it('should remove team member successfully', async () => {
      // Arrange
      const teamWithMultipleMembers: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ]
      };

      mockDatabaseService.getTeamById.mockResolvedValue(teamWithMultipleMembers);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);

      // Act
      const result = await teamService.removeTeamMember('team1', 'user2', 'user1');

      // Assert
      expect(result).toBe(true);
      expect(mockDatabaseService.removeTeamMember).toHaveBeenCalledWith('team1', 'user2');
    });

    it('should update team member role successfully', async () => {
      // Arrange
      mockDatabaseService.updateTeamMember.mockResolvedValue(true);

      // Act
      const result = await teamService.updateTeamMemberRole('team1', 'user2', 'admin', 'user1');

      // Assert
      expect(result).toBe(true);
      expect(mockDatabaseService.updateTeamMember).toHaveBeenCalledWith('team1', 'user2', { role: 'admin' });
    });
  });

  describe('Team Permissions and Validation', () => {
    it('should validate admin permissions correctly', async () => {
      // Arrange
      mockDatabaseService.getTeamById.mockResolvedValue(mockTeam);

      // Act
      const isAdmin = await teamService.isTeamAdmin('team1', 'user1');

      // Assert
      expect(isAdmin).toBe(true);
    });

    it('should validate non-admin permissions correctly', async () => {
      // Arrange
      const teamWithMember: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ]
      };

      mockDatabaseService.getTeamById.mockResolvedValue(teamWithMember);

      // Act
      const isAdmin = await teamService.isTeamAdmin('team1', 'user2');

      // Assert
      expect(isAdmin).toBe(false);
    });

    it('should prevent unauthorized team member removal', async () => {
      // Arrange
      const teamWithMember: Team = {
        ...mockTeam,
        members: [
          ...mockTeam.members,
          {
            userId: 'user2',
            email: 'user2@example.com',
            displayName: 'User Two',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ]
      };

      mockDatabaseService.getTeamById.mockResolvedValue(teamWithMember);

      // Act & Assert
      await expect(teamService.removeTeamMember('team1', 'user1', 'user2'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should set up team subscription successfully', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToTeam.mockReturnValue(mockUnsubscribe);
      const mockCallback = vi.fn();

      // Act
      const unsubscribe = teamService.subscribeToTeam('team1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToTeam).toHaveBeenCalledWith('team1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should set up user teams subscription successfully', () => {
      // Arrange
      const mockUnsubscribe = vi.fn();
      mockDatabaseService.subscribeToUserTeams.mockReturnValue(mockUnsubscribe);
      const mockCallback = vi.fn();

      // Act
      const unsubscribe = teamService.subscribeToUserTeams('user1', mockCallback);

      // Assert
      expect(mockDatabaseService.subscribeToUserTeams).toHaveBeenCalledWith('user1', mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabaseService.getUserTeams.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(teamService.getUserTeams('user1'))
        .rejects.toThrow();
    });

    it('should handle network errors with retry', async () => {
      // Arrange
      mockDatabaseService.createTeam
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('team1');

      const teamData: CreateTeamData = {
        name: 'New Team',
        description: 'A new test team',
        createdBy: 'user1'
      };

      // Act
      const teamId = await teamService.createTeam(teamData);

      // Assert
      expect(teamId).toBe('team1');
      expect(mockDatabaseService.createTeam).toHaveBeenCalledTimes(2);
    });

    it('should validate input parameters', async () => {
      // Act & Assert
      await expect(teamService.getUserTeams(''))
        .rejects.toThrow('User ID is required');

      await expect(teamService.getTeam(''))
        .rejects.toThrow('Team ID is required');

      await expect(teamService.inviteUserToTeam('', 'user1', 'test@example.com', 'Test User'))
        .rejects.toThrow('Team ID is required');
    });
  });

  describe('Speaker-to-Team-Member Matching', () => {
    const teamMembers: TeamMember[] = [
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

    it('should match speaker by exact name', () => {
      // Act
      const match = teamService.matchSpeakerToTeamMember('John Doe', teamMembers);

      // Assert
      expect(match).toBeTruthy();
      expect(match?.displayName).toBe('John Doe');
    });

    it('should match speaker by first name', () => {
      // Act
      const match = teamService.matchSpeakerToTeamMember('John', teamMembers);

      // Assert
      expect(match).toBeTruthy();
      expect(match?.displayName).toBe('John Doe');
    });

    it('should match speaker by email prefix', () => {
      // Act
      const match = teamService.matchSpeakerToTeamMember('john.doe', teamMembers);

      // Assert
      expect(match).toBeTruthy();
      expect(match?.displayName).toBe('John Doe');
    });

    it('should return null for no match', () => {
      // Act
      const match = teamService.matchSpeakerToTeamMember('Unknown Speaker', teamMembers);

      // Assert
      expect(match).toBeNull();
    });

    it('should match multiple speakers', () => {
      // Act
      const matches = teamService.matchMultipleSpeakers(['John', 'Jane', 'Unknown'], teamMembers);

      // Assert
      expect(matches.size).toBe(3);
      expect(matches.get('John')?.displayName).toBe('John Doe');
      expect(matches.get('Jane')?.displayName).toBe('Jane Smith');
      expect(matches.get('Unknown')).toBeNull();
    });
  });
});